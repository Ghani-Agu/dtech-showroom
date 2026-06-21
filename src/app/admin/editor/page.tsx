import { redirect } from 'next/navigation'

/**
 * The web editor now lives at the top-level, full-screen route `/editor`
 * (opened in its own tab). This stub keeps old links/bookmarks working.
 */
export default function AdminEditorRedirect() {
  redirect('/editor')
}
