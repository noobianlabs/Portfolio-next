import Head from "next/head";
import { SceneLoader } from "../components";
import { useEffect, useState } from "react";
import { NoScriptWarning } from "@/components/noscript/NoScript";
import { Analytics } from "@vercel/analytics/react"

const focusedTitle = "Abdullah Saleh - Portfolio";
const blurredTitle = "👀 Abdullah Saleh - Portfolio";

export default function Web() {
  const [title, setTitle] = useState("Abdullah Saleh - Portfolio");

  function onVisibilityChange() {
    const title = document.visibilityState === 'visible' ? focusedTitle : blurredTitle;

    setTitle(title);
  }

  useEffect(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }

  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>

        <meta name="description" content="Portfolio website of Abdullah Saleh" />

        <meta property="og:title" content="Abdullah Saleh - Portfolio" />
        <meta property="og:description" content="Portfolio website of Abdullah Saleh" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://abdullahsaleh.com/" />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Abdullah Saleh's portfolio" />
        <meta property="twitter:description" content="Portfolio website of Abdullah Saleh" />
        <meta property="og:site_name" content="Abdullah Saleh's portfolio"></meta>

        <link rel="icon" type="image/x-icon" href="favicon.ico" />
      </Head>
      <NoScriptWarning />
      <SceneLoader />
      <Analytics />
    </>
  );
}
