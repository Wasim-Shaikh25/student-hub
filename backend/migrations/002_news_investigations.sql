-- News Investigation Tables

-- News Articles Table
CREATE TABLE news_articles (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) NOT NULL UNIQUE,
    published_at TIMESTAMP,
    summary TEXT,
    article_hash VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'ingested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_articles_status ON news_articles(status);
CREATE INDEX ix_articles_created ON news_articles(created_at);
CREATE INDEX ix_articles_status_created ON news_articles(status, created_at);
CREATE INDEX ix_articles_url ON news_articles(url);

-- Claims Table
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    importance VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_claims_article ON claims(article_id);
CREATE INDEX ix_claims_status ON claims(status);
CREATE INDEX ix_claims_article_status ON claims(article_id, status);

-- News Evidence Table
CREATE TABLE news_evidence (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    url VARCHAR(2000) NOT NULL,
    title VARCHAR(500) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    published_at TIMESTAMP,
    excerpt TEXT,
    relation VARCHAR(50) NOT NULL,
    source_authority_score NUMERIC(3, 2) DEFAULT 0,
    relevance_score NUMERIC(3, 2) DEFAULT 0,
    recency_score NUMERIC(3, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_evidence_claim ON news_evidence(claim_id);
CREATE INDEX ix_evidence_relation ON news_evidence(relation);
CREATE INDEX ix_evidence_claim_relation ON news_evidence(claim_id, relation);

-- Analyses Table
CREATE TABLE analyses (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL UNIQUE REFERENCES news_articles(id) ON DELETE CASCADE,
    verdict VARCHAR(50) NOT NULL,
    confidence NUMERIC(3, 2) DEFAULT 0,
    summary TEXT NOT NULL,
    detailed_explanation TEXT,
    quality_score NUMERIC(3, 2) DEFAULT 0,
    conflicting_sources BOOLEAN DEFAULT FALSE,
    missing_citations BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_analyses_article ON analyses(article_id);
CREATE INDEX ix_analyses_verdict ON analyses(verdict);
CREATE INDEX ix_analyses_published ON analyses(published_at);
CREATE INDEX ix_analyses_verdict_created ON analyses(verdict, created_at);

-- Analysis Sources (Many-to-Many)
CREATE TABLE analysis_sources (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    evidence_id INTEGER NOT NULL REFERENCES news_evidence(id) ON DELETE CASCADE,
    UNIQUE(analysis_id, evidence_id)
);

CREATE INDEX ix_analysis_sources_analysis ON analysis_sources(analysis_id);
CREATE INDEX ix_analysis_sources_evidence ON analysis_sources(evidence_id);
