-- Full-Text Search: Add tsvector columns, GIN indexes, and auto-update triggers
-- This migration enables PostgreSQL full-text search across 5 tables.

-- =============================================================================
-- TASKS
-- =============================================================================

ALTER TABLE tasks ADD COLUMN search_vector tsvector;

CREATE INDEX idx_tasks_search ON tasks USING GIN (search_vector);

CREATE OR REPLACE FUNCTION tasks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_update();

UPDATE tasks SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' || coalesce(description, '')
);

-- =============================================================================
-- DOCUMENTS
-- =============================================================================

ALTER TABLE documents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);

CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '') || ' ' || coalesce(NEW.path, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content, path ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();

UPDATE documents SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(path, '')
);

-- =============================================================================
-- MEMORY CHUNKS
-- =============================================================================

ALTER TABLE memory_chunks ADD COLUMN search_vector tsvector;

CREATE INDEX idx_memory_chunks_search ON memory_chunks USING GIN (search_vector);

CREATE OR REPLACE FUNCTION memory_chunks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.content, '') || ' ' || coalesce(NEW.source_excerpt, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memory_chunks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content, source_excerpt ON memory_chunks
  FOR EACH ROW EXECUTE FUNCTION memory_chunks_search_vector_update();

UPDATE memory_chunks SET search_vector = to_tsvector('english',
  coalesce(content, '') || ' ' || coalesce(source_excerpt, '')
);

-- =============================================================================
-- CRON AGENTS
-- =============================================================================

ALTER TABLE cron_agents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_cron_agents_search ON cron_agents USING GIN (search_vector);

CREATE OR REPLACE FUNCTION cron_agents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(NEW.prompt, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cron_agents_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, prompt ON cron_agents
  FOR EACH ROW EXECUTE FUNCTION cron_agents_search_vector_update();

UPDATE cron_agents SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(prompt, '')
);

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================

ALTER TABLE conversations ADD COLUMN search_vector tsvector;

CREATE INDEX idx_conversations_search ON conversations USING GIN (search_vector);

CREATE OR REPLACE FUNCTION conversations_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.summary, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, summary ON conversations
  FOR EACH ROW EXECUTE FUNCTION conversations_search_vector_update();

UPDATE conversations SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' || coalesce(summary, '')
);
