// Aaroha Enterprise Learning Platform - Baseline State
// Calibrated for Executive Technical Education & Real Curriculum Delivery

export const initialUsers = [
  {
    id: 1,
    full_name: 'Aaroha Admin',
    email: 'admin@aaroha-inc.com',
    role: 'super_admin',
    title: 'System Administrator',
    avatar: '/avatars/3d/memo_1.png'
  },
  {
    id: 4,
    full_name: 'Ryu',
    email: 'ryu@aaroha.in',
    role: 'super_admin',
    title: 'Platform Architect',
    avatar: '/avatars/3d/memo_13.png'
  }
];

export const initialCourses = [
  {
    id: 1,
    title: 'NLP',
    slug: 'nlp-specialization',
    partner_type: 'Specialization',
    category: 'Applied AI',
    level: 'Advanced Level',
    duration: '8 Weeks',
    badge_text: 'New',
    rating: 4.90,
    reviews_count: '0',
    description: 'Natural Language Processing fundamentals and advanced architectures.',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['Transformers', 'Attention Mechanisms', 'BERT', 'LLMs'],
    is_published: true,
    is_deleted: false
  },
  {
    id: 2,
    title: 'Distributed Cloud Architecture & High-Throughput Systems',
    slug: 'distributed-cloud-architecture',
    partner_type: 'Specialization',
    category: 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '10 Weeks',
    badge_text: 'Recently updated',
    rating: 4.90,
    reviews_count: '28',
    description: 'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets.',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['Distributed Systems', 'Raft Consensus', 'Cloud Architecture', 'BGP Anycast'],
    is_published: true,
    is_deleted: false
  },
  {
    id: 3,
    title: 'Applied Machine Learning Engineering & Model Serving',
    slug: 'applied-ml-engineering',
    partner_type: 'Professional Certificate',
    category: 'Applied AI',
    level: 'Advanced Level',
    duration: '6 Weeks',
    badge_text: 'Top AI program',
    rating: 4.95,
    reviews_count: '19',
    description: 'Bridge the gap between model weights and production inference.',
    thumbnail_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80',
    skills: ['PyTorch', 'Model Serving', 'MLOps', 'Quantization'],
    is_published: true,
    is_deleted: false
  },
  {
    id: 4,
    title: 'Enterprise Cyber Defense & Zero-Day Threat Modeling',
    slug: 'enterprise-cyber-defense',
    partner_type: 'Specialization',
    category: 'Cybersecurity',
    level: 'Advanced Level',
    duration: '8 Weeks',
    badge_text: 'New',
    rating: 4.88,
    reviews_count: '14',
    description: 'Proactive threat modeling, attack surface reduction, and intrusion detection.',
    thumbnail_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    skills: ['Threat Modeling', 'Zero-Day Analysis', 'SIEM', 'mTLS'],
    is_published: true,
    is_deleted: false
  },
  {
    id: 5,
    title: 'ddd',
    slug: 'ddd-masters',
    partner_type: "Master's Program",
    category: 'Applied AI',
    level: 'Advanced Level',
    duration: '12 Weeks',
    badge_text: 'new',
    rating: 4.90,
    reviews_count: '2.8K',
    description: 'Advanced engineering program track.',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['Systems Design', 'Applied Engineering'],
    is_published: true,
    is_deleted: false
  },
  {
    id: 6,
    title: 'SS',
    slug: 'ss-degree-track',
    partner_type: 'Degree Track',
    category: 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '12 Weeks',
    badge_text: 'new',
    rating: 4.80,
    reviews_count: '2.8K',
    description: 'Specialized degree track for scalable engineering.',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['High Throughput', 'Architecture'],
    is_published: true,
    is_deleted: false
  }
];

export const initialEnrollments = [];
export const initialLessonProgress = [];
export const initialTaskSubmissions = [];
export const initialCertificates = [];
export const initialDegrees = [];
