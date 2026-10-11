import Head from 'next/head';
import PortfolioReading from '../components/portfolio/PortfolioReading';

const title = 'Abdullah Saleh · People > Profit · Development preview';
const description = 'Software engineering, developer advocacy, and community work by Abdullah Saleh. A development preview using public portfolio content.';

export default function PortfolioPage() {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#202923" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Head>
      <PortfolioReading />
    </>
  );
}
