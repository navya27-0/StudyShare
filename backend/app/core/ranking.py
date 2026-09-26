"""Ranking Algorithm for StudyShare Educational Resources
======================================================

Formula Design & Mathematical Rationale:
----------------------------------------
The ranking score balances four core dimensions:
1. Quality Consensus (Bayesian Adjusted Rating)
2. Community Validation (Logarithmic Net Votes)
3. Direct Utility & Engagement (Downloads & Views)
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

3. Engagement & Utility (E):
   A download signifies high academic utility (saving or printing for exam prep), whereas a view
   is passive interest. We weight downloads at 2.0x and views at 0.5x, compressed logarithmically:
       E = ln(1 + downloads_count * 2.0 + views_count * 0.5)

4. Academic Authority Bonus (B_auth):
   Resources verified by faculty or course coordinators (is_verified = True) guarantee syllabus
   accuracy and receive a flat +2.0 boost:
       B_auth = 2.0 if is_verified else 0.0

5. Curricular Gravity Time Decay (D_recency):
   Standard exponential decay (e^-λt) causes older resources to rapidly vanish, which is disastrous
   for timeless university subjects (e.g., standard Data Structures, Operating Systems, or Calculus
   notes remain relevant for years). However, truly stale resources with low engagement must sink.
   We implement a soft power-law gravity curve with a 30-day baseline (approx. 1 month):
       age_in_days = (current_time - created_at) in days
       D_recency = 1.0 / (1.0 + age_in_days / 30.0) ^ 0.4

   Decay benchmarks:
   - Day 0 (Brand new): 1.00x multiplier
   - Day 30 (1 month):  0.76x multiplier
   - Day 90 (1 term):   0.57x multiplier
   - Day 180 (1 sem):   0.47x multiplier
   - Day 365 (1 year):  0.36x multiplier

   Result: A 1-year-old authoritative lecture note with 150 upvotes and 4.9 rating still scores
   comfortably above a brand-new unvoted upload, while a 90-day-old resource with no votes or low
   ratings will gracefully sink to the bottom.

Final Score:
------------
   RankingScore = (2.0 * R_adj + V_net + E + B_auth) * D_recency
"""

import math
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import case, func, literal


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

    # 3. Engagement
    engagement = math.log(1.0 + downloads_count * 2.0 + views_count * 0.5)

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
    directly inside the database engine.
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

    # 3. Engagement
    engagement_term = func.ln(
        literal(1.0)
        + resource_cls.downloads_count * literal(2.0)
        + resource_cls.views_count * literal(0.5)
    )

    # 4. Authority Bonus
    authority_term = case((resource_cls.is_verified.is_(True), literal(2.0)), else_=literal(0.0))

    # 5. Recency Decay
    age_seconds = func.greatest(
        literal(0.0), func.extract("epoch", func.now() - resource_cls.created_at)
    )
    age_days = age_seconds / literal(86400.0)
    decay_term = func.power(literal(1.0) + (age_days / literal(30.0)), literal(0.4))

    return (rating_term + vote_term + engagement_term + authority_term) / decay_term
