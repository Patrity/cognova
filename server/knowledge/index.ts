import type { IKnowledgeLoader } from './types'
import { FilesystemKnowledgeLoader } from './fs-loader'

let _loader: IKnowledgeLoader | null = null

export function getKnowledgeLoader(): IKnowledgeLoader {
  if (!_loader) {
    const config = useRuntimeConfig()
    _loader = new FilesystemKnowledgeLoader(config.knowledgePath)
  }
  return _loader
}
