import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import async_session_maker
from app.models.enums import ReportStatus, ResourceType, UserRole, VoteType
from app.models.interactions import Bookmark, ModerationAction, Rating, Report, Vote
from app.models.profile import ContributorProfile
from app.models.resource import Resource, ResourceVersion
from app.models.taxonomy import Subject, Topic, Unit
from app.models.user import User


async def seed_data(session: AsyncSession) -> None:
    # Check if data already seeded
    existing_users = await session.execute(select(User).limit(1))
    if existing_users.scalar_one_or_none():
        print("Database already contains records. Skipping seed.")
        return

    print("Seeding StudyShare database with realistic academic dataset...")
    now = datetime.now(UTC)

    # 1. Users
    default_password = hash_password("StudyShare2024!")

    prof_sharma = User(
        email="prof.sharma@university.edu",
        hashed_password=default_password,
        display_name="Prof. K. Sharma",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role=UserRole.ADMIN,
        is_active=True,
        is_superuser=True,
        created_at=now - timedelta(days=120),
    )

    arvind = User(
        email="arvind.raman@student.univ.edu",
        hashed_password=default_password,
        display_name="Arvind Raman",
        avatar_url="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
        role=UserRole.STUDENT,
        is_active=True,
        created_at=now - timedelta(days=90),
    )

    sneha = User(
        email="sneha.rao@student.univ.edu",
        hashed_password=default_password,
        display_name="Sneha Rao",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        role=UserRole.STUDENT,
        is_active=True,
        created_at=now - timedelta(days=80),
    )

    devansh = User(
        email="devansh.m@student.univ.edu",
        hashed_password=default_password,
        display_name="Devansh Mehta",
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        role=UserRole.STUDENT,
        is_active=True,
        created_at=now - timedelta(days=60),
    )

    ananya = User(
        email="ananya.iyer@student.univ.edu",
        hashed_password=default_password,
        display_name="Ananya Iyer",
        avatar_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        role=UserRole.STUDENT,
        is_active=True,
        created_at=now - timedelta(days=45),
    )

    session.add_all([prof_sharma, arvind, sneha, devansh, ananya])
    await session.flush()

    prof_profile = ContributorProfile(
        user_id=prof_sharma.id,
        bio="Professor of Computer Science & Systems Architect",
        department="Computer Science & Engineering",
        reputation_points=500,
        total_uploads=10,
        total_upvotes_received=450,
        created_at=now - timedelta(days=120),
    )
    arvind_profile = ContributorProfile(
        user_id=arvind.id,
        bio="3rd Year CSE | Distributed Systems & Algorithms enthusiast",
        semester=5,
        department="Computer Science & Engineering",
        reputation_points=180,
        total_uploads=5,
        total_upvotes_received=92,
        created_at=now - timedelta(days=90),
    )
    sneha_profile = ContributorProfile(
        user_id=sneha.id,
        bio="3rd Year CSE | Database internals & Graph Theory",
        semester=5,
        department="Computer Science & Engineering",
        reputation_points=140,
        total_uploads=4,
        total_upvotes_received=78,
        created_at=now - timedelta(days=80),
    )
    devansh_profile = ContributorProfile(
        user_id=devansh.id,
        bio="2nd Year CSE | Operating Systems & Computer Architecture",
        semester=4,
        department="Computer Science & Engineering",
        reputation_points=65,
        total_uploads=2,
        total_upvotes_received=31,
        created_at=now - timedelta(days=60),
    )
    ananya_profile = ContributorProfile(
        user_id=ananya.id,
        bio="2nd Year CSE | Automata Theory & Compiler Design",
        semester=3,
        department="Computer Science & Engineering",
        reputation_points=45,
        total_uploads=1,
        total_upvotes_received=18,
        created_at=now - timedelta(days=45),
    )
    session.add_all([prof_profile, arvind_profile, sneha_profile, devansh_profile, ananya_profile])
    await session.flush()

    # 2. Subjects, Units, Topics
    # Subject 1: Data Structures & Algorithms
    cs201 = Subject(
        code="CS201",
        name="Data Structures & Algorithms",
        semester=3,
        department="Computer Science & Engineering",
        created_at=now - timedelta(days=100),
    )
    session.add(cs201)
    await session.flush()

    u1_cs201 = Unit(
        subject_id=cs201.id,
        unit_number=1,
        title="Linear Data Structures & Amortized Analysis",
        ordering=1,
        created_at=now - timedelta(days=100),
    )
    u2_cs201 = Unit(
        subject_id=cs201.id,
        unit_number=2,
        title="Balanced Search Trees & Heaps",
        ordering=2,
        created_at=now - timedelta(days=100),
    )
    u3_cs201 = Unit(
        subject_id=cs201.id,
        unit_number=3,
        title="Graph Algorithms & Traversal",
        ordering=3,
        created_at=now - timedelta(days=100),
    )
    session.add_all([u1_cs201, u2_cs201, u3_cs201])
    await session.flush()

    t1_cs201 = Topic(
        unit_id=u1_cs201.id, title="Linked Lists, Stacks & Queue Applications", ordering=1
    )
    t2_cs201 = Topic(
        unit_id=u2_cs201.id, title="AVL Tree Rotations and Balance Factor Analysis", ordering=1
    )
    t3_cs201 = Topic(unit_id=u2_cs201.id, title="B-Trees & B+ Tree Multi-way Indexing", ordering=2)
    t4_cs201 = Topic(
        unit_id=u3_cs201.id, title="Dijkstra & Bellman-Ford Shortest Path Proofs", ordering=1
    )
    t5_cs201 = Topic(unit_id=u3_cs201.id, title="Topological Sorting & Kosaraju SCC", ordering=2)
    session.add_all([t1_cs201, t2_cs201, t3_cs201, t4_cs201, t5_cs201])
    await session.flush()

    # Subject 2: Database Management Systems
    cs301 = Subject(
        code="CS301",
        name="Database Management Systems",
        semester=4,
        department="Computer Science & Engineering",
        created_at=now - timedelta(days=95),
    )
    session.add(cs301)
    await session.flush()

    u1_cs301 = Unit(
        subject_id=cs301.id,
        unit_number=1,
        title="Relational Data Model & Formal Query Languages",
        ordering=1,
        created_at=now - timedelta(days=95),
    )
    u2_cs301 = Unit(
        subject_id=cs301.id,
        unit_number=2,
        title="Schema Refinement & Normalization Theory",
        ordering=2,
        created_at=now - timedelta(days=95),
    )
    u3_cs301 = Unit(
        subject_id=cs301.id,
        unit_number=3,
        title="Transactions, Concurrency Control & Recovery",
        ordering=3,
        created_at=now - timedelta(days=95),
    )
    session.add_all([u1_cs301, u2_cs301, u3_cs301])
    await session.flush()

    t1_cs301 = Topic(
        unit_id=u1_cs301.id, title="Relational Algebra Operators & Query Trees", ordering=1
    )
    t2_cs301 = Topic(
        unit_id=u2_cs301.id, title="Functional Dependencies & BCNF Decomposition", ordering=1
    )
    t3_cs301 = Topic(
        unit_id=u2_cs301.id, title="3NF Synthesis and Dependency Preservation", ordering=2
    )
    t4_cs301 = Topic(
        unit_id=u3_cs301.id, title="Two-Phase Locking (2PL) & Conflict Serializability", ordering=1
    )
    session.add_all([t1_cs301, t2_cs301, t3_cs301, t4_cs301])
    await session.flush()

    # Subject 3: Computer Networks
    cs401 = Subject(
        code="CS401",
        name="Computer Networks",
        semester=5,
        department="Computer Science & Engineering",
        created_at=now - timedelta(days=90),
    )
    session.add(cs401)
    await session.flush()

    u1_cs401 = Unit(
        subject_id=cs401.id,
        unit_number=1,
        title="Data Link Layer & Sliding Window Protocols",
        ordering=1,
        created_at=now - timedelta(days=90),
    )
    u2_cs401 = Unit(
        subject_id=cs401.id,
        unit_number=2,
        title="Network Layer, Routing & Subnetting",
        ordering=2,
        created_at=now - timedelta(days=90),
    )
    u3_cs401 = Unit(
        subject_id=cs401.id,
        unit_number=3,
        title="Transport Layer Protocols & Congestion Control",
        ordering=3,
        created_at=now - timedelta(days=90),
    )
    session.add_all([u1_cs401, u2_cs401, u3_cs401])
    await session.flush()

    t1_cs401 = Topic(
        unit_id=u1_cs401.id,
        title="CRC Error Detection & Selective Repeat Sliding Window",
        ordering=1,
    )
    t2_cs401 = Topic(
        unit_id=u2_cs401.id, title="CIDR IP Subnetting & Hierarchical Routing", ordering=1
    )
    t3_cs401 = Topic(
        unit_id=u3_cs401.id, title="TCP 3-Way Handshake & State Transition Diagram", ordering=1
    )
    t4_cs401 = Topic(
        unit_id=u3_cs401.id, title="TCP Reno vs Tahoe Congestion Control Curves", ordering=2
    )
    session.add_all([t1_cs401, t2_cs401, t3_cs401, t4_cs401])
    await session.flush()

    # Subject 4: Operating Systems
    cs302 = Subject(
        code="CS302",
        name="Operating Systems",
        semester=4,
        department="Computer Science & Engineering",
        created_at=now - timedelta(days=85),
    )
    session.add(cs302)
    await session.flush()

    u1_cs302 = Unit(
        subject_id=cs302.id,
        unit_number=1,
        title="Process Management & CPU Scheduling",
        ordering=1,
        created_at=now - timedelta(days=85),
    )
    u2_cs302 = Unit(
        subject_id=cs302.id,
        unit_number=2,
        title="Process Synchronization & Deadlocks",
        ordering=2,
        created_at=now - timedelta(days=85),
    )
    session.add_all([u1_cs302, u2_cs302])
    await session.flush()

    t1_cs302 = Topic(
        unit_id=u1_cs302.id, title="Round Robin and Multilevel Queue Scheduling", ordering=1
    )
    t2_cs302 = Topic(
        unit_id=u2_cs302.id, title="Peterson's Algorithm & Counting Semaphores", ordering=1
    )
    t3_cs302 = Topic(
        unit_id=u2_cs302.id, title="Banker's Algorithm Safe State Determination", ordering=2
    )
    session.add_all([t1_cs302, t2_cs302, t3_cs302])
    await session.flush()

    # 3. Resources & Resource Versions
    resources_spec = [
        # Resource 1: AVL Trees
        {
            "topic_id": t2_cs201.id,
            "uploader_id": prof_sharma.id,
            "type": ResourceType.PDF,
            "title": "Complete AVL Tree Insertion & Deletion Rotations Guide",
            "description": "Comprehensive blackboard lecture notes with step-by-step LL, RR, LR, RL single and double rotation trace diagrams.",
            "file_url": "/uploads/cs201/avl_tree_complete_guide_sharma.pdf",
            "file_size_bytes": 4404019,
            "page_count": 34,
            "semester": 3,
            "upvotes_count": 142,
            "downvotes_count": 2,
            "rating_avg": 4.9,
            "rating_count": 48,
            "is_verified": True,
            "created_at": now - timedelta(days=40),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs201/avl_tree_guide_v1.pdf",
                    "note": "Initial lecture handout for Section A",
                    "size": 4194304,
                    "pages": 30,
                    "days": 40,
                },
                {
                    "ver": 2,
                    "url": "/uploads/cs201/avl_tree_complete_guide_sharma.pdf",
                    "note": "Added 4 worked deletion examples and proof of worst-case height 1.44 log n",
                    "size": 4404019,
                    "pages": 34,
                    "days": 20,
                },
            ],
        },
        # Resource 2: B+ Trees
        {
            "topic_id": t3_cs201.id,
            "uploader_id": sneha.id,
            "type": ResourceType.NOTES,
            "title": "B-Tree vs B+ Tree Indexing Comparison & Node Splitting Rules",
            "description": "Handwritten concise revision cheat sheet summarizing order M node split, merge rules, and index pointer calculation.",
            "file_url": "/uploads/cs201/b_trees_indexing_cheatsheet.pdf",
            "file_size_bytes": 2621440,
            "page_count": 16,
            "semester": 3,
            "upvotes_count": 88,
            "downvotes_count": 1,
            "rating_avg": 4.8,
            "rating_count": 31,
            "is_verified": True,
            "created_at": now - timedelta(days=25),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs201/b_trees_indexing_cheatsheet.pdf",
                    "note": "Compiled from exam review session",
                    "size": 2621440,
                    "pages": 16,
                    "days": 25,
                }
            ],
        },
        # Resource 3: Dijkstra
        {
            "topic_id": t4_cs201.id,
            "uploader_id": arvind.id,
            "type": ResourceType.QUESTION_BANK,
            "title": "Dijkstra & Bellman-Ford: 5-Year Solved Exam Question Bank",
            "description": "Collection of university midterm and end-semester numericals with complete distance matrix tables and negative cycle detection.",
            "file_url": "/uploads/cs201/shortest_path_pyq_solutions.pdf",
            "file_size_bytes": 5242880,
            "page_count": 42,
            "semester": 3,
            "upvotes_count": 174,
            "downvotes_count": 0,
            "rating_avg": 5.0,
            "rating_count": 62,
            "is_verified": True,
            "created_at": now - timedelta(days=15),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs201/shortest_path_pyq_solutions.pdf",
                    "note": "Includes 2019-2024 university exam papers",
                    "size": 5242880,
                    "pages": 42,
                    "days": 15,
                }
            ],
        },
        # Resource 4: DS Lab Record
        {
            "topic_id": t1_cs201.id,
            "uploader_id": devansh.id,
            "type": ResourceType.LAB_RECORD,
            "title": "Data Structures Laboratory Manual (All 12 C Programs with Output)",
            "description": "Tested code for circular linked lists, infix-to-postfix stack conversions, priority queues, and BST traversals with terminal logs.",
            "file_url": "/uploads/cs201/ds_lab_manual_verified.pdf",
            "file_size_bytes": 3145728,
            "page_count": 48,
            "semester": 3,
            "upvotes_count": 112,
            "downvotes_count": 3,
            "rating_avg": 4.7,
            "rating_count": 29,
            "is_verified": True,
            "created_at": now - timedelta(days=35),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs201/ds_lab_manual_verified.pdf",
                    "note": "Complete laboratory coursework signed by lab instructor",
                    "size": 3145728,
                    "pages": 48,
                    "days": 35,
                }
            ],
        },
        # Resource 5: BCNF Normalization
        {
            "topic_id": t2_cs301.id,
            "uploader_id": arvind.id,
            "type": ResourceType.PDF,
            "title": "BCNF & 3NF Lossless Join Decomposition Proofs & Canonical Covers",
            "description": "Step-by-step algorithms for computing minimal cover, checking closure of attribute sets, and testing lossless join via tableau method.",
            "file_url": "/uploads/cs301/bcnf_decomposition_proofs.pdf",
            "file_size_bytes": 3879731,
            "page_count": 28,
            "semester": 4,
            "upvotes_count": 204,
            "downvotes_count": 2,
            "rating_avg": 4.95,
            "rating_count": 75,
            "is_verified": True,
            "created_at": now - timedelta(days=30),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs301/bcnf_decomposition_proofs.pdf",
                    "note": "Prepared for database theory midterm prep",
                    "size": 3879731,
                    "pages": 28,
                    "days": 30,
                }
            ],
        },
        # Resource 6: Concurrency 2PL
        {
            "topic_id": t4_cs301.id,
            "uploader_id": prof_sharma.id,
            "type": ResourceType.PAPER,
            "title": "Strict 2PL vs Rigorous 2PL: Cascading Aborts & Recoverability",
            "description": "Lecture monograph detailing how strict two-phase locking guarantees freedom from cascading aborts and serializable schedules.",
            "file_url": "/uploads/cs301/concurrency_2pl_recoverability.pdf",
            "file_size_bytes": 1887436,
            "page_count": 18,
            "semester": 4,
            "upvotes_count": 96,
            "downvotes_count": 1,
            "rating_avg": 4.85,
            "rating_count": 22,
            "is_verified": True,
            "created_at": now - timedelta(days=18),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs301/concurrency_2pl_recoverability.pdf",
                    "note": "Midterm supplement for CSE students",
                    "size": 1887436,
                    "pages": 18,
                    "days": 18,
                }
            ],
        },
        # Resource 7: DBMS SQL Queries
        {
            "topic_id": t1_cs301.id,
            "uploader_id": sneha.id,
            "type": ResourceType.QUESTION_BANK,
            "title": "Complex SQL Nested Subqueries & Correlated Joins Practice Set",
            "description": "50 practical university exam questions covering GROUP BY HAVING, self joins, window analytical functions, and recursive CTEs.",
            "file_url": "/uploads/cs301/complex_sql_practice_set.pdf",
            "file_size_bytes": 2202009,
            "page_count": 24,
            "semester": 4,
            "upvotes_count": 135,
            "downvotes_count": 0,
            "rating_avg": 4.9,
            "rating_count": 41,
            "is_verified": True,
            "created_at": now - timedelta(days=22),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs301/complex_sql_practice_set.pdf",
                    "note": "Includes solution keys verified on PostgreSQL 16",
                    "size": 2202009,
                    "pages": 24,
                    "days": 22,
                }
            ],
        },
        # Resource 8: Computer Networks CRC & Sliding Window
        {
            "topic_id": t1_cs401.id,
            "uploader_id": devansh.id,
            "type": ResourceType.NOTES,
            "title": "CRC Polynomial Division & Go-Back-N Protocol Window Efficiency",
            "description": "Formulas for link utilization, optimal window size (2a + 1), and step-by-step binary polynomial long division derivations.",
            "file_url": "/uploads/cs401/crc_sliding_window_derivations.pdf",
            "file_size_bytes": 1992294,
            "page_count": 20,
            "semester": 5,
            "upvotes_count": 78,
            "downvotes_count": 1,
            "rating_avg": 4.65,
            "rating_count": 19,
            "is_verified": True,
            "created_at": now - timedelta(days=14),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs401/crc_sliding_window_derivations.pdf",
                    "note": "Formula derivations with exam memory tricks",
                    "size": 1992294,
                    "pages": 20,
                    "days": 14,
                }
            ],
        },
        # Resource 9: CIDR Subnetting
        {
            "topic_id": t2_cs401.id,
            "uploader_id": arvind.id,
            "type": ResourceType.QUESTION_BANK,
            "title": "VLSM & CIDR IP Addressing: 30 Solved Numerical Problems",
            "description": "Detailed breakdowns of variable-length subnet masks, usable host IP calculation, broadcast address derivation, and routing table aggregation.",
            "file_url": "/uploads/cs401/cidr_subnetting_30_solved_problems.pdf",
            "file_size_bytes": 3460300,
            "page_count": 32,
            "semester": 5,
            "upvotes_count": 162,
            "downvotes_count": 1,
            "rating_avg": 4.92,
            "rating_count": 53,
            "is_verified": True,
            "created_at": now - timedelta(days=12),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs401/cidr_subnetting_30_solved_problems.pdf",
                    "note": "Includes step-by-step bitwise AND subnet calculations",
                    "size": 3460300,
                    "pages": 32,
                    "days": 12,
                }
            ],
        },
        # Resource 10: TCP State Transition
        {
            "topic_id": t3_cs401.id,
            "uploader_id": prof_sharma.id,
            "type": ResourceType.PDF,
            "title": "TCP FSM State Transition Diagram & TIME_WAIT Socket Mechanics",
            "description": "High-resolution architecture diagram of TCP client/server states, 2MSL wait explanation, and SYN flood protection mechanisms.",
            "file_url": "/uploads/cs401/tcp_state_fsm_architecture.pdf",
            "file_size_bytes": 2831155,
            "page_count": 14,
            "semester": 5,
            "upvotes_count": 120,
            "downvotes_count": 0,
            "rating_avg": 4.88,
            "rating_count": 37,
            "is_verified": True,
            "created_at": now - timedelta(days=8),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs401/tcp_state_fsm_architecture.pdf",
                    "note": "Authoritative faculty lecture slides",
                    "size": 2831155,
                    "pages": 14,
                    "days": 8,
                }
            ],
        },
        # Resource 11: OS CPU Scheduling
        {
            "topic_id": t1_cs302.id,
            "uploader_id": ananya.id,
            "type": ResourceType.NOTES,
            "title": "CPU Scheduling Algorithms: Gantt Chart Construction & Wait Times",
            "description": "Comparative table for FCFS, Non-preemptive & Preemptive SJF (SRTF), Priority Scheduling, and Round Robin with context switch overhead.",
            "file_url": "/uploads/cs302/cpu_scheduling_gantt_charts.pdf",
            "file_size_bytes": 2411724,
            "page_count": 22,
            "semester": 4,
            "upvotes_count": 91,
            "downvotes_count": 2,
            "rating_avg": 4.75,
            "rating_count": 28,
            "is_verified": True,
            "created_at": now - timedelta(days=21),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs302/cpu_scheduling_gantt_charts.pdf",
                    "note": "Clear handwritten examples for average turnaround time",
                    "size": 2411724,
                    "pages": 22,
                    "days": 21,
                }
            ],
        },
        # Resource 12: Banker's Algorithm
        {
            "topic_id": t3_cs302.id,
            "uploader_id": devansh.id,
            "type": ResourceType.PDF,
            "title": "Banker's Algorithm: Resource Request Safety Test Solved Problems",
            "description": "Matrix calculations (Allocation, Max, Available, Need) with 8 worked exam questions demonstrating safe sequences and deadlock recovery.",
            "file_url": "/uploads/cs302/bankers_algorithm_safety_problems.pdf",
            "file_size_bytes": 3145728,
            "page_count": 26,
            "semester": 4,
            "upvotes_count": 105,
            "downvotes_count": 1,
            "rating_avg": 4.82,
            "rating_count": 33,
            "is_verified": True,
            "created_at": now - timedelta(days=16),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs302/bankers_algorithm_safety_problems.pdf",
                    "note": "Midterm numericals with safety algorithm proofs",
                    "size": 3145728,
                    "pages": 26,
                    "days": 16,
                }
            ],
        },
        # Resource 13: Outdated Syllabus Report Target
        {
            "topic_id": t1_cs301.id,
            "uploader_id": devansh.id,
            "type": ResourceType.PAPER,
            "title": "2017 Mid-Semester Examination Question Paper (Previous Regulation R16)",
            "description": "Legacy exam question paper containing obsolete relational calculus questions removed from the current R22 academic syllabus.",
            "file_url": "/uploads/cs301/2017_midterm_legacy_r16.pdf",
            "file_size_bytes": 1048576,
            "page_count": 8,
            "semester": 4,
            "upvotes_count": 4,
            "downvotes_count": 12,
            "rating_avg": 2.1,
            "rating_count": 14,
            "is_verified": False,
            "created_at": now - timedelta(days=60),
            "versions": [
                {
                    "ver": 1,
                    "url": "/uploads/cs301/2017_midterm_legacy_r16.pdf",
                    "note": "Uploaded from archive scan",
                    "size": 1048576,
                    "pages": 8,
                    "days": 60,
                }
            ],
        },
    ]

    created_resources = []
    for r_spec in resources_spec:
        res = Resource(
            topic_id=r_spec["topic_id"],
            uploader_id=r_spec["uploader_id"],
            type=r_spec["type"],
            title=r_spec["title"],
            description=r_spec["description"],
            file_url=r_spec["file_url"],
            file_size_bytes=r_spec["file_size_bytes"],
            page_count=r_spec["page_count"],
            semester=r_spec["semester"],
            upvotes_count=r_spec["upvotes_count"],
            downvotes_count=r_spec["downvotes_count"],
            rating_avg=r_spec["rating_avg"],
            rating_count=r_spec["rating_count"],
            is_verified=r_spec["is_verified"],
            created_at=r_spec["created_at"],
            updated_at=r_spec["created_at"],
        )
        session.add(res)
        await session.flush()

        # Add versions
        latest_ver_id = None
        for v in r_spec["versions"]:
            ver_obj = ResourceVersion(
                resource_id=res.id,
                version_number=v["ver"],
                file_url=v["url"],
                changelog=v["note"],
                uploaded_by=r_spec["uploader_id"],
                file_size_bytes=v["size"],
                page_count=v["pages"],
                created_at=now - timedelta(days=v["days"]),
            )
            session.add(ver_obj)
            await session.flush()
            latest_ver_id = ver_obj.id

        # Update current active version pointer
        res.current_version_id = latest_ver_id
        created_resources.append(res)

    await session.flush()

    # 4. Interactions: Votes, Ratings, Bookmarks, Reports, Moderation Actions
    # Upvotes by users
    v1 = Vote(resource_id=created_resources[0].id, user_id=arvind.id, value=VoteType.UP)
    v2 = Vote(resource_id=created_resources[0].id, user_id=sneha.id, value=VoteType.UP)
    v3 = Vote(resource_id=created_resources[4].id, user_id=prof_sharma.id, value=VoteType.UP)
    v4 = Vote(resource_id=created_resources[4].id, user_id=devansh.id, value=VoteType.UP)
    v5 = Vote(resource_id=created_resources[12].id, user_id=ananya.id, value=VoteType.DOWN)
    session.add_all([v1, v2, v3, v4, v5])

    # Ratings
    rat1 = Rating(resource_id=created_resources[0].id, user_id=arvind.id, stars=5)
    rat2 = Rating(resource_id=created_resources[0].id, user_id=sneha.id, stars=5)
    rat3 = Rating(resource_id=created_resources[4].id, user_id=prof_sharma.id, stars=5)
    rat4 = Rating(resource_id=created_resources[12].id, user_id=ananya.id, stars=2)
    session.add_all([rat1, rat2, rat3, rat4])

    # Bookmarks
    b1 = Bookmark(
        user_id=arvind.id, resource_id=created_resources[0].id, created_at=now - timedelta(days=5)
    )
    b2 = Bookmark(
        user_id=arvind.id, resource_id=created_resources[4].id, created_at=now - timedelta(days=3)
    )
    b3 = Bookmark(
        user_id=sneha.id, resource_id=created_resources[2].id, created_at=now - timedelta(days=7)
    )
    b4 = Bookmark(
        user_id=devansh.id, resource_id=created_resources[3].id, created_at=now - timedelta(days=2)
    )
    session.add_all([b1, b2, b3, b4])

    # Report on legacy outdated syllabus resource (Resource 13)
    rep1 = Report(
        resource_id=created_resources[12].id,
        reporter_id=ananya.id,
        reason="Outdated R16 syllabus. Current university curriculum follows R22 regulation where this topic was shifted to elective.",
        status=ReportStatus.OPEN,
        created_at=now - timedelta(days=2),
    )
    session.add(rep1)

    # Moderation Action on Resource 1 (Prof verified)
    mod1 = ModerationAction(
        admin_id=prof_sharma.id,
        resource_id=created_resources[0].id,
        action="verified_syllabus",
        note="Verified complete alignment with R22 academic curriculum and course outcomes.",
        created_at=now - timedelta(days=19),
    )
    session.add(mod1)

    await session.commit()
    print("Database seeding completed successfully!")
    print(
        f"Seeded: {len(resources_spec)} resources across 4 subjects, 11 units, and 14 topics with users, votes, ratings, bookmarks, and moderation audit trail."
    )


async def main():
    async with async_session_maker() as session:
        await seed_data(session)


if __name__ == "__main__":
    asyncio.run(main())
