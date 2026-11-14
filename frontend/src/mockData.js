// Aaroha Enterprise Learning Platform - Coursera-Calibrated State
// Calibrated for Executive Technical Education & Real Curriculum Delivery

export const initialUsers = [
  {
    id: 1,
    full_name: 'Dr. Aris Thorne',
    email: 'admin@aaroha-inc.com',
    password: 'password123',
    role: 'admin',
    title: 'Director of Curriculum & Distributed Systems Faculty',
    avatar: '/avatars/3d/memo_1.png'
  },
  {
    id: 2,
    full_name: 'Elena Rostova',
    email: 'elena.rostova@enterprise.io',
    password: 'password123',
    role: 'student',
    title: 'Senior Systems Architect',
    avatar: '/avatars/3d/memo_13.png'
  }
];

export const initialCourses = [
  {
    id: 1,
    title: 'Distributed Cloud Architecture & High-Throughput Systems',
    slug: 'distributed-cloud-architecture',
    institution: 'Aaroha Institute of Technology',
    institution_subtitle: 'Systems Engineering Laboratory',
    partner_type: 'Specialization',
    description: 'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets, Raft consensus, and transactional integrity.',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    category: 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '8 Weeks',
    commitment: '4–6 hours/week',
    schedule_type: 'Flexible Schedule (Learn at your own pace)',
    certificate_type: 'Shareable Professional Certificate',
    rating: 4.9,
    reviews_count: '2,840',
    enrolled_count: 14820,
    is_published: true,
    created_by: 1,
    skills: [
      'Distributed Systems',
      'Raft Consensus Protocol',
      'BGP Anycast Routing',
      'mTLS & Zero-Trust',
      'Storage Engines (LSM & B-Trees)',
      'Kafka & CDC Event Streaming'
    ],
    what_you_will_learn: [
      'Architect zero-trust multi-region ingress gateways utilizing Anycast BGP and Envoy proxy mesh routing',
      'Implement fault-tolerant distributed state machines using Raft consensus and split-brain mitigation invariants',
      'Tune write-heavy storage engines by comparing Log-Structured Merge (LSM) trees with InnoDB B+Trees',
      'Eliminate dual-write vulnerabilities with Change Data Capture (CDC) pipelines and transactional outbox patterns'
    ],
    instructor: {
      name: 'Dr. Aris Thorne',
      title: 'Principal Systems Architect & Chair of Infrastructure',
      department: 'Distributed Systems Group, Aaroha Institute',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      bio: 'Former Infrastructure Architect with 18+ years designing Tier-1 high-throughput hyper-scale services, distributed consensus engines, and kernel networking.',
      rating: 4.94,
      students: '42,000+'
    },
    modules: [
      {
        id: 101,
        course_id: 1,
        title: 'Module 1: Global Edge Routing & Zero-Trust Boundaries',
        sequence_order: 1,
        estimated_time: '5 hours to complete',
        description: 'Explore ingress topology, Anycast BGP routing, and mTLS cryptography inside production Kubernetes clusters.',
        lessons: [
          {
            id: 1001,
            module_id: 101,
            title: 'Multi-Region Anycast Topology & BGP Ingress Routing',
            content_type: 'video',
            media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            duration: '22 min',
            is_free_preview: true,
            sequence_order: 1,
            content_body: 'An in-depth analysis of global edge ingress networks. We evaluate how Anycast DNS and BGP route optimization direct user packets to the nearest Point of Presence (PoP), mitigating latency before requests reach internal mesh clusters. We examine real packet capture profiles and failure mode recovery when an undersea transit link experiences degradation.'
          },
          {
            id: 1002,
            module_id: 101,
            title: 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices',
            content_type: 'article',
            media_url: null,
            duration: '14 min read',
            is_free_preview: false,
            sequence_order: 2,
            content_body: 'Perimeter-only security models fail once an adversary establishes lateral mobility inside your cluster. In this lesson, we specify zero-trust service-to-service communication using SPIFFE/SPIRE identity standards. We examine x509 certificate rotation pipelines, hardware security module (HSM) key isolation, and how Envoy sidecars negotiate cryptographic handshakes without introducing CPU bottlenecks.'
          }
        ],
        tasks: [
          {
            id: 2001,
            module_id: 101,
            title: 'Assignment 1: Ingress Gateway Resiliency & Failover Specification',
            task_type: 'text_response',
            instructions: 'Draft an architectural RFC detailing a dual-region active-active ingress routing plan. Specify: 1) Health check probe frequencies and dead-man switches; 2) State synchronization strategy for TLS session resumption tickets; 3) Circuit breaking rules to prevent cascading brownouts during regional evacuation.',
            max_score: 100,
            passing_score: 75,
            is_mandatory: true
          }
        ]
      },
      {
        id: 102,
        course_id: 1,
        title: 'Module 2: Distributed Consensus & State Storage',
        sequence_order: 2,
        estimated_time: '6 hours to complete',
        description: 'Master Raft leader election, commit log safety, and high-performance LSM storage engine compaction.',
        lessons: [
          {
            id: 1003,
            module_id: 102,
            title: 'Raft Consensus Protocol & Split-Brain Mitigation',
            content_type: 'video',
            media_url: 'https://www.youtube.com/embed/R2-9sDYtOt4',
            video_provider: 'youtube',
            duration: '28 min',
            is_free_preview: false,
            sequence_order: 1,
            content_body: 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm: leader election, log replication, safety invariants, and commit index advancement. We inspect how network partitions induce partitioned quorums and why strict majority voting guarantees no two nodes can commit contradictory log entries.'
          },
          {
            id: 1004,
            module_id: 102,
            title: 'LSM Trees vs B-Trees in Modern Storage Engines',
            content_type: 'article',
            media_url: null,
            duration: '18 min read',
            is_free_preview: false,
            sequence_order: 2,
            content_body: 'Choosing between Log-Structured Merge (LSM) trees (RocksDB, Cassandra) and traditional B+Trees (InnoDB, PostgreSQL) dictates write amplification and read amplification. We examine memtable flushes, write-ahead logs (WAL), Bloom filter tuning, and tiered compaction strategies under sustained write pressures.'
          }
        ],
        tasks: [
          {
            id: 2002,
            module_id: 102,
            title: 'Assignment 2: Database Partitioning & Benchmark Artifact',
            task_type: 'file_upload',
            instructions: 'Submit your benchmark repository link or technical report demonstrating a sharded database cluster with composite partition keys. Include P95/P99 latency measurements under a simulated 20,000 write ops/sec load profile.',
            max_score: 100,
            passing_score: 80,
            is_mandatory: true
          }
        ]
      },
      {
        id: 103,
        course_id: 1,
        title: 'Module 3: Event Sourcing & High-Throughput Streaming',
        sequence_order: 3,
        estimated_time: '5 hours to complete',
        description: 'Build change-data-capture pipelines and Kafka stream processors for guaranteed delivery semantics.',
        lessons: [
          {
            id: 1005,
            module_id: 103,
            title: 'Transactional Outbox Pattern & CDC Stream Pipelines',
            content_type: 'article',
            media_url: null,
            duration: '16 min read',
            is_free_preview: false,
            sequence_order: 1,
            content_body: 'Dual-write operations between a relational database and a message broker are vulnerable to split-second failures that cause data inconsistency. We implement the Transactional Outbox Pattern using Change Data Capture (CDC) via Debezium and Kafka, guaranteeing at-least-once message delivery with exactly-once consumer semantics.'
          }
        ],
        tasks: [
          {
            id: 2003,
            module_id: 103,
            title: 'Assignment 3: Capstone Distributed Architecture Defense',
            task_type: 'text_response',
            instructions: 'Synthesize Modules 1, 2, and 3 into a comprehensive architectural defense. Defend your choice of storage engines, consensus mechanisms, and egress rate limits against an unpredictable 10x traffic spike.',
            max_score: 100,
            passing_score: 80,
            is_mandatory: true
          }
        ]
      }
    ],
    is_deleted: true
  },
  {
    id: 2,
    title: 'Applied Machine Learning Engineering & Model Serving',
    slug: 'applied-ml-engineering',
    institution: 'Aaroha Institute of Technology',
    institution_subtitle: 'Applied Intelligence Faculty',
    partner_type: 'Professional Certificate',
    description: 'Bridge the gap between model weights and production inference. Build low-latency GPU serving pipelines, dynamic batching, AWQ quantization, and drift monitoring.',
    thumbnail_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80',
    category: 'Applied AI',
    level: 'Advanced Level',
    duration: '6 Weeks',
    commitment: '5–7 hours/week',
    schedule_type: 'Flexible Schedule (Learn at your own pace)',
    certificate_type: 'Shareable Professional Certificate',
    rating: 4.95,
    reviews_count: '1,920',
    enrolled_count: 11200,
    is_published: true,
    created_by: 1,
    skills: [
      'GPU Kernel Optimization',
      'INT8 & 4-Bit AWQ Quantization',
      'vLLM & Continuous Batching',
      'Triton Inference Server',
      'Concept Drift Monitoring',
      'CUDA Memory Bounds'
    ],
    what_you_will_learn: [
      'Compress and quantize transformer weights (AWQ / GPTQ) without degrading downstream domain perplexity',
      'Deploy vLLM and TensorRT-LLM inference engines with paged attention and continuous request batching',
      'Implement real-time feature drift detection using Kolmogorov-Smirnov and Population Stability Index metrics',
      'Design high-throughput asynchronous inference pipelines with zero memory fragmentation on NVIDIA clusters'
    ],
    instructor: {
      name: 'Dr. Marcus Vance',
      title: 'Distinguished ML Systems Engineer',
      department: 'Accelerated Computing Lab, Aaroha Institute',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      bio: 'Pioneered low-latency LLM serving runtimes and custom CUDA kernel optimizations for enterprise machine learning infrastructure.',
      rating: 4.96,
      students: '29,000+'
    },
    modules: [
      {
        id: 201,
        course_id: 2,
        title: 'Module 1: Kernel Optimization & Quantization Dynamics',
        sequence_order: 1,
        estimated_time: '6 hours to complete',
        description: 'Analyze post-training quantization, INT8 calibration, and memory-bandwidth bound operations.',
        lessons: [
          {
            id: 2001,
            module_id: 201,
            title: 'FP16, INT8 & INT4 Quantization Dynamics',
            content_type: 'video',
            media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            duration: '25 min',
            is_free_preview: true,
            sequence_order: 1,
            content_body: 'Techniques for compressing deep neural network weights without sacrificing perplexity or evaluation benchmarks. We dive into post-training quantization (PTQ) vs quantization-aware training (QAT), weight-activation calibration, and GPU memory bandwidth limitations.'
          },
          {
            id: 2002,
            module_id: 201,
            title: 'PagedAttention & Continuous Request Batching',
            content_type: 'article',
            media_url: null,
            duration: '19 min read',
            is_free_preview: false,
            sequence_order: 2,
            content_body: 'Traditional KV-cache allocations reserve maximum sequence lengths up-front, wasting 60-80% of GPU VRAM. We analyze PagedAttention virtual memory mapping, dynamic block paging, and continuous batching schedulers that saturate tensor cores under variable user prompt lengths.'
          }
        ],
        tasks: [
          {
            id: 3001,
            module_id: 201,
            title: 'Assignment 1: Quantization Benchmarking Analysis',
            task_type: 'text_response',
            instructions: 'Submit a quantitative comparison of perplexity versus throughput across FP16, INT8, and 4-bit AWQ implementations on an NVIDIA A10G/L4 GPU profile.',
            max_score: 100,
            passing_score: 70,
            is_mandatory: true
          }
        ]
      },
      {
        id: 202,
        course_id: 2,
        title: 'Module 2: Production Model Serving & Drift Guardrails',
        sequence_order: 2,
        estimated_time: '5 hours to complete',
        description: 'Deploy Triton Inference Server with dynamic request batching and automated drift alerting.',
        lessons: [
          {
            id: 2003,
            module_id: 202,
            title: 'Triton Server Architecture & Dynamic Batching',
            content_type: 'video',
            media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            duration: '27 min',
            is_free_preview: false,
            sequence_order: 1,
            content_body: 'Architecting multi-model concurrent execution using NVIDIA Triton Inference Server. We tune dynamic batching delay windows to balance tail latency against GPU compute saturation.'
          }
        ],
        tasks: [
          {
            id: 3002,
            module_id: 202,
            title: 'Assignment 2: Production Inference Pipeline Deployment',
            task_type: 'file_upload',
            instructions: 'Provide an infrastructure-as-code configuration and load-test output demonstrating dynamic batching with P99 response times below 80ms under 500 concurrent client threads.',
            max_score: 100,
            passing_score: 75,
            is_mandatory: true
          }
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'Enterprise Cyber Defense & Zero-Day Threat Modeling',
    slug: 'enterprise-cyber-defense',
    institution: 'Aaroha Institute of Technology',
    institution_subtitle: 'Center for Cyber Resilience',
    partner_type: 'Specialization',
    description: 'Master application security and infrastructure defense: threat modeling, memory-safe migration, cryptographic supply-chain security, and real-time incident triage.',
    thumbnail_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    category: 'Cybersecurity',
    level: 'Advanced Level',
    duration: '10 Weeks',
    commitment: '4–6 hours/week',
    schedule_type: 'Flexible Schedule (Learn at your own pace)',
    certificate_type: 'Shareable Professional Certificate',
    rating: 4.88,
    reviews_count: '1,450',
    enrolled_count: 9800,
    is_published: true,
    created_by: 1,
    skills: [
      'STRIDE Threat Modeling',
      'Memory Safety & Rust Interop',
      'Software Supply Chain Security (SLSA)',
      'eBPF Runtime Introspection',
      'Incident Forensics & Mitigation',
      'Zero-Trust Cryptography'
    ],
    what_you_will_learn: [
      'Execute enterprise-wide threat assessments using STRIDE and MITRE ATT&CK frameworks',
      'Secure the CI/CD pipeline against supply-chain attacks using Sigstore cosign and SLSA Level 3 attestations',
      'Instrument kernel-level security telemetry with eBPF to detect lateral process injection in real time',
      'Conduct post-breach forensics and deploy cryptographic boundary isolations under active compromise'
    ],
    instructor: {
      name: 'Katarina Wolf',
      title: 'Principal Security Architect & Red Team Fellow',
      department: 'Center for Cyber Resilience, Aaroha Institute',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      bio: '15+ years advising defense and high-frequency financial institutions on advanced adversary emulation, cryptographic defenses, and incident containment.',
      rating: 4.92,
      students: '21,500+'
    },
    modules: [
      {
        id: 301,
        course_id: 3,
        title: 'Module 1: Threat Modeling & Supply-Chain Attestation',
        sequence_order: 1,
        estimated_time: '6 hours to complete',
        description: 'Understand STRIDE risk modeling and cryptographic artifact signing with Sigstore cosign.',
        lessons: [
          {
            id: 3001,
            module_id: 301,
            title: 'STRIDE Threat Modeling for Cloud-Native Microservices',
            content_type: 'video',
            media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            duration: '24 min',
            is_free_preview: true,
            sequence_order: 1,
            content_body: 'Deconstructing real-world attack vectors against containerized microservices. We apply STRIDE threat modeling to data flow diagrams, identifying unauthenticated gRPC endpoints, insecure deserialization risks, and privilege escalation vulnerabilities.'
          },
          {
            id: 3002,
            module_id: 301,
            title: 'Supply Chain Security: SLSA Level 3 & Cosign Attestations',
            content_type: 'article',
            media_url: null,
            duration: '15 min read',
            is_free_preview: false,
            sequence_order: 2,
            content_body: 'Recent breaches reveal that build pipelines are the prime target for software supply chain injection. We construct reproducible hermetic builds and enforce admission controllers (Kyverno) that reject unsigned container images lacking verified SLSA provenance.'
          }
        ],
        tasks: [
          {
            id: 4001,
            module_id: 301,
            title: 'Assignment 1: Supply Chain Security Audit & Policy Gate',
            task_type: 'text_response',
            instructions: 'Analyze an attached container build manifest and author a Kyverno admission policy that enforces cryptographic signature verification and SBOM presence before deployment to production.',
            max_score: 100,
            passing_score: 80,
            is_mandatory: true
          }
        ]
      }
    ]
  }
];

export const initialEnrollments = [
  {
    id: 501,
    user_id: 2, // Elena Rostova
    course_id: 1,
    status: 'active',
    enrolled_at: '2026-10-15T10:00:00Z',
    expires_at: '2027-04-15T10:00:00Z',
    completed_at: null
  }
];

export const initialLessonProgress = [
  {
    id: 601,
    enrollment_id: 501,
    lesson_id: 1001,
    is_completed: true,
    completed_at: '2026-10-16T14:30:00Z'
  },
  {
    id: 602,
    enrollment_id: 501,
    lesson_id: 1002,
    is_completed: true,
    completed_at: '2026-10-17T09:15:00Z'
  }
];

export const initialTaskSubmissions = [
  {
    id: 701,
    task_id: 2001,
    enrollment_id: 501,
    student_name: 'Elena Rostova',
    submission_text: 'For the active-active multi-region ingress configuration, we establish BGP Anycast routes with Route Health Injection (RHI) to ensure traffic withdraws cleanly within 3 seconds of health check failure. TLS session tickets are secured using a distributed Redis cluster with asymmetric session encryption keys rotated hourly via HashiCorp Vault. Rate-limiting is enforced at the Envoy edge using token bucket algorithms with a maximum burst capacity of 150% baseline.',
    attachment_url: 'https://aaroha-inc.com/artifacts/rfc-ingress-failover-v1.pdf',
    status: 'passed',
    score: 96,
    feedback: 'Rigorous architectural breakdown. The BGP withdrawal timeframe and Redis session key rotation meet enterprise production standards.',
    graded_by: 1,
    submitted_at: '2026-10-18T16:20:00Z',
    graded_at: '2026-10-19T11:00:00Z'
  },
  {
    id: 702,
    task_id: 2002,
    enrollment_id: 501,
    student_name: 'Elena Rostova',
    submission_text: 'Benchmarking report attached demonstrating horizontal sharding across 4 shards using MurmurHash3 for composite key distribution. Under 20k writes/sec, P95 latency remained under 4.2ms, and P99 stayed bounded at 11.8ms.',
    attachment_url: 'https://aaroha-inc.com/artifacts/sharding-benchmark-metrics.zip',
    status: 'under_review',
    score: null,
    feedback: null,
    graded_by: null,
    submitted_at: '2026-10-22T19:45:00Z',
    graded_at: null
  }
];

export const initialCertificates = [
  {
    id: 1,
    certificate_code: 'AAROHA-CERT-2026-9E4F-8812',
    course_id: 1,
    course_title: 'Distributed Cloud Architecture & High-Throughput Systems',
    user_id: 2,
    recipient_name: 'Elena Rostova',
    recipient_email: 'elena.rostova@enterprise.io',
    issuer_id: 1,
    issuer_name: 'Dr. Aris Thorne',
    issuer_title: 'Director of Curriculum & Distributed Systems Faculty',
    grade: 'Executive Distinction (98% Pass · Verified Peer Reviewed)',
    issued_at: '2026-11-13T12:00:00Z'
  }
];
