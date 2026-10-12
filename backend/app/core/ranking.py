"""Ranking Algorithm for StudyShare Educational Resources
======================================================

Formula Design & Mathematical Rationale:
----------------------------------------
The ranking score balances four core dimensions:
1. Quality Consensus (Bayesian Adjusted Rating — authenticated signal)
2. Community Validation (Logarithmic Net Votes — authenticated signal)
3. Direct Utility & Bounded Engagement (Downloads & Capped Passive Views)
4. Syllabus / Academic Authority (Verified Badge)
All scaled against a Time-Decay Gravity Curve designed specifically for academic curricula.

Mathematical Definition:
------------------------
1. Bayesian Adjusted Rating (R_adj):
   Raw star ratings suffer from small sample bias (e.g., one 5-star rating outranking a 4.9-star
   resource with 100 reviews). We apply a Bayesian m-estimate with a prior of m = 3.5 stars
   weighted by C = 3 pseudo-ratings:
       R_adj = (rating_count * rating_avg + 3.0 * 3.5) / (rating_count + 3.0)
   Weight: Multiplied by 2.0 (yields a base score contribution between 2.0 and 10.0 points).

2. Net Votes with Logarithmic Compression (V_net):
   Net community sentiment is upvotes minus downvotes:
       net_votes = upvotes_count - downvotes_count
   To reward consensus without allowing vote counts to exponentially dominate all other factors,
   we apply signed logarithmic compression:
       V_net = sign(net_votes) * ln(1 + |net_votes|) * 1.5
   A resource with +50 net votes contributes ~5.9 points; +200 net votes contributes ~7.9 points.

3. Anti-Manipulation Engagement & Utility (E):
   A download signifies active academic utility, whereas a page view is a passive signal.
   To prevent unauthenticated view-bot inflation from outranking community-reviewed material,
   passive views are weighted at 0.15x and hard-capped at 500 effective views:
       effective_views = min(views_count, 500)
       E = ln(1 + downloads_count * 1.5 + effective_views * 0.15)

4. Academic Authority Bonus (B_auth):
   Resources verified by faculty or course coordinators (is_verified = True) guarantee syllabus
   accuracy and receive a flat +2.0 boost:
       B_auth = 2.0 if is_verified else 0.0

5. Curricular Gravity Time Decay (D_recency):
   We implement a soft power-law gravity curve with a 30-day baseline (approx. 1 month):
       age_in_days = (current_time - created_at) in days
       D_recency = 1.0 / (1.0 + age_in_days / 30.0) ^ 0.4

Final Score:
------------
   RankingScore = (2.0 * R_adj + V_net + E + B_auth) * D_recency
"""

import math
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Float, case, func, literal
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import FunctionElement

PASSIVE_VIEW_CAP = 500
PASSIVE_VIEW_WEIGHT = 0.15
DOWNLOAD_UTILITY_WEIGHT = 1.5


class _AgeInDays(FunctionElement):
    type = Float()
    inherit_cache = True


@compiles(_AgeInDays)
def _compile_age_in_days_default(element: Any, compiler: Any, **kw: Any) -> str:
    (col,) = list(element.clauses)
    return f"(EXTRACT(epoch FROM (now() - {compiler.process(col, **kw)})) / 86400.0)"


@compiles(_AgeInDays, "sqlite")
def _compile_age_in_days_sqlite(element: Any, compiler: Any, **kw: Any) -> str:
    (col,) = list(element.clauses)
    return f"(julianday(CURRENT_TIMESTAMP) - julianday({compiler.process(col, **kw)}))"


def compute_ranking_score(
    rating_avg: float,
    rating_count: int,
    upvotes_count: int,
    downvotes_count: int,
    downloads_count: int,
    views_count: int,
    is_verified: bool,
    created_at: datetime,
) -> float:
    """Calculate the ranking score in Python for serialization and testing."""
    # 1. Bayesian Rating
    r_adj = (rating_count * rating_avg + 3.0 * 3.5) / (rating_count + 3.0)
    rating_score = 2.0 * r_adj

    # 2. Net Votes
    net_votes = upvotes_count - downvotes_count
    if net_votes > 0:
        vote_score = math.log(1.0 + net_votes) * 1.5
    elif net_votes < 0:
        vote_score = -math.log(1.0 + abs(net_votes)) * 1.5
    else:
        vote_score = 0.0

    # 3. Engagement (with capped passive views to prevent artificial inflation)
    effective_views = min(max(0, views_count), PASSIVE_VIEW_CAP)
    engagement = math.log(
        1.0
        + max(0, downloads_count) * DOWNLOAD_UTILITY_WEIGHT
        + effective_views * PASSIVE_VIEW_WEIGHT
    )

    # 4. Authority
    authority = 2.0 if is_verified else 0.0

    # 5. Recency Decay
    now = datetime.now(UTC)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    age_in_days = max(0.0, (now - created_at).total_seconds() / 86400.0)
    decay = 1.0 / math.pow(1.0 + (age_in_days / 30.0), 0.4)

    total_score = (rating_score + vote_score + engagement + authority) * decay
    return round(total_score, 3)


def get_ranking_sql_expression(resource_cls: Any) -> Any:
    """
    Generate the equivalent SQLAlchemy column expression to order by ranking score
    directly inside the database engine (compatible with both PostgreSQL and SQLite).
    """
    # 1. Bayesian Rating (prior 3.5 stars, weight 3.0)
    r_adj = (resource_cls.rating_count * resource_cls.rating_avg + 3.0 * 3.5) / (
        resource_cls.rating_count + 3.0
    )
    rating_term = literal(2.0) * r_adj

    # 2. Net Votes with Logarithmic Compression
    net_votes = resource_cls.upvotes_count - resource_cls.downvotes_count
    vote_term = case(
        (net_votes > 0, func.ln(literal(1.0) + net_votes) * literal(1.5)),
        (net_votes < 0, -func.ln(literal(1.0) + func.abs(net_votes)) * literal(1.5)),
        else_=literal(0.0),
    )

    # 3. Engagement with capped passive views
    effective_views = case(
        (resource_cls.views_count > literal(PASSIVE_VIEW_CAP), literal(float(PASSIVE_VIEW_CAP))),
        else_=resource_cls.views_count,
    )
    engagement_term = func.ln(
        literal(1.0)
        + resource_cls.downloads_count * literal(DOWNLOAD_UTILITY_WEIGHT)
        + effective_views * literal(PASSIVE_VIEW_WEIGHT)
    )

    # 4. Authority Bonus
    authority_term = case((resource_cls.is_verified.is_(True), literal(2.0)), else_=literal(0.0))

    # 5. Recency Decay
    raw_age_days = _AgeInDays(resource_cls.created_at)
    age_days = case(
        (raw_age_days > literal(0.0), raw_age_days),
        else_=literal(0.0),
    )
    decay_term = func.power(literal(1.0) + (age_days / literal(30.0)), literal(0.4))

    return (rating_term + vote_term + engagement_term + authority_term) / decay_term
