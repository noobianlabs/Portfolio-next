import Head from 'next/head'
import styles from '@/styles/Studio.module.css'

/** Keep the self-contained room outside React and the legacy homepage styles. */
export default function Studio() {
  return (
    <>
      <Head>
        <title>Abdullah Saleh · Studio preview</title>
        <meta name="description" content="An explorable studio for software, study, and community practice." />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" key="viewport" />
      </Head>
      <main className={styles.studio} aria-label="Interactive portfolio studio">
        <a className={styles.readingLink} href="/portfolio">Read the portfolio without 3D</a>
        <iframe
          className={styles.room}
          src="/studio-runtime/index.html"
          title="Abdullah Saleh’s interactive studio"
          sandbox="allow-scripts allow-same-origin allow-downloads allow-top-navigation-by-user-activation allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
        <noscript>
          <p className={styles.noScript}>The interactive room needs JavaScript. <a href="/portfolio">Read the portfolio</a>.</p>
        </noscript>
      </main>
    </>
  )
}
