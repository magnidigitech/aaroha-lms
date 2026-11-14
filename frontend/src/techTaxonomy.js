/**
 * Aaroha LMS - Open Source Technology Taxonomy & Semantic Search Engine
 * Maps technology domains, subdomains, acronyms, and semantic relationships.
 * Connects to open-source public APIs (Wikipedia OpenSearch / ConceptNet / GitHub Topics)
 * to feed real-time technology suggestions to the search bar.
 */

// 1. Curated Open-Source Technology Hierarchy & Domain-Subdomain Taxonomy
export const TECH_TAXONOMY = [
  {
    domain: 'Artificial Intelligence & Machine Learning',
    domain_code: 'ai',
    synonyms: ['ai', 'applied ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'dl'],
    subdomains: [
      {
        name: 'Natural Language Processing (NLP)',
        slug: 'nlp',
        keywords: ['nlp', 'natural language processing', 'text processing', 'linguistics', 'tokenization', 'sentiment analysis', 'named entity recognition'],
        description: 'Subdomain of AI focused on linguistics, computational text, tokenization and semantic comprehension'
      },
      {
        name: 'Large Language Models & Transformers',
        slug: 'llm',
        keywords: ['llm', 'large language models', 'transformers', 'gpt', 'bert', 'attention mechanism', 'self-attention', 'fine-tuning', 'lora'],
        description: 'Subdomain of AI & NLP powering foundation generative language architectures'
      },
      {
        name: 'Model Serving & Inference Optimization',
        slug: 'model-serving',
        keywords: ['model serving', 'vllm', 'triton', 'awq', 'quantization', 'int8', '4-bit', 'gpu kernel', 'cuda', 'continuous batching', 'inference'],
        description: 'Subdomain of Applied AI for deploying scalable low-latency neural network serving'
      },
      {
        name: 'Computer Vision',
        slug: 'computer-vision',
        keywords: ['computer vision', 'cv', 'object detection', 'cnn', 'image segmentation', 'convolutional neural networks'],
        description: 'Subdomain of AI for visual scene comprehension and high-dimensional image analysis'
      },
      {
        name: 'Reinforcement Learning',
        slug: 'reinforcement-learning',
        keywords: ['reinforcement learning', 'rl', 'rlhf', 'policy gradient', 'q-learning', 'markov decision process'],
        description: 'Subdomain of AI for agent-based optimization through environmental reward signals'
      }
    ]
  },
  {
    domain: 'Distributed Systems & Cloud Architecture',
    domain_code: 'cloud',
    synonyms: ['cloud', 'cloud architecture', 'distributed systems', 'infrastructure', 'backend', 'cloud computing'],
    subdomains: [
      {
        name: 'Consensus Protocols (Raft & Paxos)',
        slug: 'raft-consensus',
        keywords: ['raft', 'raft consensus', 'paxos', 'distributed consensus', 'leader election', 'log replication', 'split-brain', 'etcd'],
        description: 'Subdomain of Distributed Systems ensuring atomic state transitions across nodes'
      },
      {
        name: 'High-Throughput Storage Engines',
        slug: 'storage-engines',
        keywords: ['storage engines', 'lsm trees', 'b-trees', 'rocksdb', 'wal', 'write ahead log', 'compaction', 'memtable'],
        description: 'Subdomain of Systems Engineering for persistent write-heavy distributed databases'
      },
      {
        name: 'Multi-Region Ingress & Anycast BGP',
        slug: 'anycast-ingress',
        keywords: ['anycast', 'bgp', 'envoy', 'ingress gateway', 'mtls', 'reverse proxy', 'zero-trust ingress', 'load balancing'],
        description: 'Subdomain of Cloud Architecture for ultra-low latency global traffic routing'
      },
      {
        name: 'Event Streaming & CDC Pipelines',
        slug: 'event-streaming',
        keywords: ['kafka', 'cdc', 'event streaming', 'debezium', 'event-driven architecture', 'pubsub', 'message brokers'],
        description: 'Subdomain of Distributed Systems for real-time decoupled streaming topologies'
      },
      {
        name: 'Container Orchestration & Microservices',
        slug: 'kubernetes',
        keywords: ['kubernetes', 'k8s', 'docker', 'containers', 'microservices', 'service mesh', 'istio'],
        description: 'Subdomain of Cloud Infrastructure for resilient container scheduling and lifecycle management'
      }
    ]
  },
  {
    domain: 'Cybersecurity & Threat Modeling',
    domain_code: 'security',
    synonyms: ['security', 'cybersecurity', 'cyber defense', 'infosec', 'threat modeling'],
    subdomains: [
      {
        name: 'STRIDE Threat Modeling',
        slug: 'threat-modeling',
        keywords: ['stride', 'threat modeling', 'spoofing', 'tampering', 'repudiation', 'elevation of privilege', 'attack tree'],
        description: 'Subdomain of Cyber Defense for formal architectural risk decomposition'
      },
      {
        name: 'eBPF Runtime Introspection',
        slug: 'ebpf-security',
        keywords: ['ebpf', 'kernel security', 'runtime security', 'syscall monitoring', 'network observability'],
        description: 'Subdomain of Cyber Defense for real-time kernel-space telemetry without modules'
      },
      {
        name: 'Supply Chain Security (SLSA)',
        slug: 'supply-chain',
        keywords: ['slsa', 'software supply chain', 'sbom', 'sigstore', 'artifact attestation', 'zero-day'],
        description: 'Subdomain of Cyber Defense preventing dependency poisoning and compromised build pipelines'
      },
      {
        name: 'Zero-Trust Cryptography',
        slug: 'zero-trust',
        keywords: ['zero-trust', 'cryptography', 'pki', 'mtls', 'ephemeral certificates', 'identity-based access'],
        description: 'Subdomain of Cyber Defense removing implicit perimeter network trust'
      }
    ]
  }
];

// 2. Popular & Trending Technology Search Pills
export const POPULAR_TECHNOLOGY_TAGS = [
  { label: 'NLP', category: 'Applied AI', query: 'NLP' },
  { label: 'Artificial Intelligence', category: 'Applied AI', query: 'AI' },
  { label: 'Raft Consensus', category: 'Cloud Architecture', query: 'Raft' },
  { label: 'Distributed Systems', category: 'Cloud Architecture', query: 'Distributed' },
  { label: 'vLLM & AWQ', category: 'Applied AI', query: 'vLLM' },
  { label: 'Zero-Trust Defense', category: 'Cybersecurity', query: 'Zero-Trust' },
  { label: 'Threat Modeling', category: 'Cybersecurity', query: 'STRIDE' },
  { label: 'Anycast Ingress', category: 'Cloud Architecture', query: 'Anycast' }
];

/**
 * Helper to match a query term against text with word boundary protection for short acronyms.
 */
export function termMatches(text, query) {
  if (!text || !query) return false;
  const t = text.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (t === q) return true;
  if (q.length <= 3) {
    const regex = new RegExp(`(^|[^a-z0-9])${q}([^a-z0-9]|$)`, 'i');
    return regex.test(t);
  }
  return t.includes(q);
}

/**
 * Expand a user search query into semantically related terms, acronyms, and subdomains.
 * For example:
 * 'ai' -> ['ai', 'artificial intelligence', 'nlp', 'natural language processing', 'model serving', 'machine learning', ...]
 * 'nlp' -> ['nlp', 'natural language processing', 'tokenization', 'transformers', ...]
 */
export function expandSearchTerms(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const terms = new Set([q]);

  // Handle specific common acronyms directly
  if (q === 'ai' || q === 'applied ai') {
    terms.add('artificial intelligence');
    terms.add('nlp');
    terms.add('natural language processing');
    terms.add('machine learning');
    terms.add('ml');
    terms.add('deep learning');
    terms.add('model serving');
    terms.add('vllm');
    terms.add('llm');
    terms.add('transformers');
  }

  if (q === 'nlp' || q === 'natural language' || q === 'natural language processing') {
    terms.add('nlp');
    terms.add('natural language processing');
    terms.add('natural language');
    terms.add('tokenization');
    terms.add('text processing');
    terms.add('linguistics');
    terms.add('transformers');
  }

  if (q === 'cloud' || q === 'distributed' || q === 'systems') {
    terms.add('cloud architecture');
    terms.add('distributed systems');
    terms.add('raft');
    terms.add('consensus');
    terms.add('storage engines');
    terms.add('kafka');
    terms.add('anycast');
    terms.add('bgp');
    terms.add('ingress');
  }

  if (q === 'security' || q === 'cyber' || q === 'cybersecurity') {
    terms.add('cyber defense');
    terms.add('threat modeling');
    terms.add('stride');
    terms.add('zero-trust');
    terms.add('ebpf');
    terms.add('zero-day');
    terms.add('cryptography');
  }

  // Iterate taxonomy to find matching domains or subdomains using boundary-safe matching
  for (const domain of TECH_TAXONOMY) {
    const domainMatches = domain.synonyms.some(syn => termMatches(syn, q) || (q.length > 3 && termMatches(q, syn)));

    if (domainMatches) {
      // If user searched for the domain (e.g. 'ai'), include all subdomain keywords!
      domain.synonyms.forEach(s => terms.add(s));
      for (const sub of domain.subdomains) {
        terms.add(sub.name.toLowerCase());
        sub.keywords.forEach(kw => terms.add(kw));
      }
    } else {
      // Check if user searched for a specific subdomain (e.g. 'nlp', 'raft', 'stride')
      for (const sub of domain.subdomains) {
        const subMatches = sub.keywords.some(kw => termMatches(kw, q) || (q.length > 3 && termMatches(q, kw)));
        if (subMatches) {
          terms.add(sub.name.toLowerCase());
          sub.keywords.forEach(kw => terms.add(kw));
        }
      }
    }
  }

  return Array.from(terms);
}

/**
 * Intelligent course matching algorithm.
 * Evaluates course title, category, description, about, skills, what you'll learn,
 * and individual module/lesson titles against expanded semantic search terms.
 */
export function courseMatchesQuery(course, query) {
  if (!query || !query.trim()) return true;
  if (!course) return false;

  const q = query.trim().toLowerCase();
  const expandedTerms = expandSearchTerms(q);

  // Helper to extract textual content from arrays or strings safely
  const safeText = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join(' ').toLowerCase();
    if (typeof val === 'string') return val.toLowerCase();
    return String(val).toLowerCase();
  };

  const title = safeText(course.title);
  const category = safeText(course.category);
  const description = safeText(course.description);
  const about = safeText(course.about);
  const skills = safeText(course.skills);
  const outcomes = safeText(course.what_you_will_learn);
  const badge = safeText(course.badge_text);

  // Collect module and lesson titles
  const moduleTitles = (course.modules || []).map(m => safeText(m.title) + ' ' + safeText(m.description)).join(' ');
  const lessonTitles = (course.modules || []).flatMap(m => (m.lessons || []).map(l => safeText(l.title) + ' ' + safeText(l.content_body))).join(' ');

  const fullCorpus = `${title} ${category} ${description} ${about} ${skills} ${outcomes} ${badge} ${moduleTitles} ${lessonTitles}`.toLowerCase();

  // 1. Direct match on original query using boundary protection
  if (termMatches(fullCorpus, q)) {
    return true;
  }

  // 2. Hierarchical AI <-> NLP matching:
  // If query is 'ai', courses in 'Applied AI' or courses titled 'NLP' or covering NLP match!
  if (termMatches(q, 'ai') || q === 'artificial intelligence') {
    if (termMatches(category, 'ai') || termMatches(title, 'nlp') || termMatches(fullCorpus, 'nlp')) {
      return true;
    }
  }

  // If query is 'nlp', any course with 'nlp' or 'natural language' in title, content, or skills matches!
  if (termMatches(q, 'nlp') || q.includes('natural language')) {
    if (termMatches(title, 'nlp') || termMatches(fullCorpus, 'natural language') || termMatches(skills, 'nlp')) {
      return true;
    }
  }

  // 3. Match any expanded semantic term
  for (const term of expandedTerms) {
    if (term.length >= 2 && termMatches(fullCorpus, term)) {
      return true;
    }
  }

  // 4. Token-level partial match (all words in multi-word query exist in corpus)
  const queryTokens = q.split(/\s+/).filter(t => t.length > 1);
  if (queryTokens.length > 1) {
    const allTokensMatch = queryTokens.every(tok => fullCorpus.includes(tok));
    if (allTokensMatch) return true;
  }

  return false;
}

/**
 * Fetch real-time technology suggestions.
 * Queries local ontology first, then supplements via open-source Wikipedia OpenSearch API.
 */
export async function getTechnologySuggestions(query) {
  if (!query || query.trim().length === 0) {
    // Return top curated suggestions
    return POPULAR_TECHNOLOGY_TAGS.map(t => ({
      name: t.label,
      domain: t.category,
      keyword: t.query,
      source: 'curated'
    }));
  }

  const q = query.trim().toLowerCase();
  const results = [];
  const seen = new Set();

  // 1. Scan Local Taxonomy with boundary-safe matching
  for (const domain of TECH_TAXONOMY) {
    const isDomainMatch = termMatches(domain.domain, q) || domain.synonyms.some(s => termMatches(s, q));

    if (isDomainMatch) {
      if (!seen.has(domain.domain)) {
        seen.add(domain.domain);
        results.push({
          name: domain.domain,
          domain: 'Core Engineering Discipline',
          keyword: domain.synonyms[0] || domain.domain,
          description: `Includes ${domain.subdomains.map(s => s.name.split(' ')[0]).join(', ')}`,
          source: 'taxonomy'
        });
      }

      // Also include the subdomains of this matched domain so users see subdomains like NLP under AI
      for (const sub of domain.subdomains) {
        if (!seen.has(sub.name)) {
          seen.add(sub.name);
          results.push({
            name: sub.name,
            domain: `Subdomain of ${domain.domain}`,
            keyword: sub.keywords[0] || sub.slug,
            description: sub.description,
            source: 'taxonomy'
          });
        }
      }
    } else {
      // Check subdomains individually
      for (const sub of domain.subdomains) {
        if (termMatches(sub.name, q) || sub.keywords.some(k => termMatches(k, q))) {
          if (!seen.has(sub.name)) {
            seen.add(sub.name);
            results.push({
              name: sub.name,
              domain: `Subdomain of ${domain.domain}`,
              keyword: sub.keywords[0] || sub.slug,
              description: sub.description,
              source: 'taxonomy'
            });
          }
        }
      }
    }
  }

  // 2. Fetch from Open-Source Wikipedia OpenSearch API (CORS enabled, public, free)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s rapid fallback

    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json&origin=*`;
    const res = await fetch(wikiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const titles = data[1] || [];
      const descriptions = data[2] || [];

      titles.forEach((title, idx) => {
        if (!seen.has(title) && results.length < 8) {
          // Filter to tech-relevant results
          seen.add(title);
          results.push({
            name: title,
            domain: 'Open-Source Concept & Standard',
            keyword: title,
            description: descriptions[idx] || 'Technical topic from open-source knowledge base',
            source: 'opensource'
          });
        }
      });
    }
  } catch (err) {
    // Graceful fallback to taxonomy results if offline or aborted
  }

  return results.slice(0, 8);
}
