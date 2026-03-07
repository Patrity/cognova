import { resolveKnowledgeBase, buildKnowledgeFileTree } from '~~/server/utils/knowledge-path'

export default defineEventHandler(async () => {
  const base = resolveKnowledgeBase()
  const files = await buildKnowledgeFileTree(base)
  return { data: files }
})
