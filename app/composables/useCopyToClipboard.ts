/**
 * Copy text to clipboard with fallback for non-secure contexts (HTTP).
 * navigator.clipboard.writeText() requires HTTPS or localhost.
 * The fallback uses a hidden textarea + execCommand('copy').
 */
export function useCopyToClipboard() {
  async function copy(text: string): Promise<boolean> {
    // Try modern clipboard API first (works on HTTPS / localhost)
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // Fall through to legacy method
      }
    }

    // Legacy fallback for HTTP / non-secure contexts
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }

  return { copy }
}
