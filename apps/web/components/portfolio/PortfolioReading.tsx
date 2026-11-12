import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { embeddedContext, mountPortfolioBridge, matchesProjectFilter, projectFromHash } from './discovery.mjs';
import { publicProjects } from './projects';
import type { ProjectFilter } from './projects';
import styles from '../../styles/Portfolio.module.css';

const subscribeHydration = () => () => {};
const getEnhancedSnapshot = () => true;
const getServerSnapshot = () => false;
const subscribeHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const getHashSnapshot = () => window.location.hash;
const getServerHashSnapshot = () => '';
function getEmbeddedSnapshot() {
  let parentHref = null;
  try { parentHref = window.parent !== window ? window.parent.location.href : null; } catch { /* Cross-origin parents are not trusted. */ }
  return Boolean(embeddedContext({ href: window.location.href, parentHref, isFramed: window.parent !== window }));
}

const filters: readonly { value: ProjectFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'community', label: 'Community & advocacy' },
];

function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children} <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>;
}

export default function PortfolioReading() {
  const root = useRef<HTMLDivElement>(null);
  const enhanced = useSyncExternalStore(subscribeHydration, getEnhancedSnapshot, getServerSnapshot);
  const embedded = useSyncExternalStore(subscribeHydration, getEmbeddedSnapshot, getServerSnapshot);
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [reveal, setReveal] = useState<{ id: string } | null>(null);
  const hash = useSyncExternalStore(subscribeHash, getHashSnapshot, getServerHashSnapshot);
  const initialProject = projectFromHash(hash, publicProjects);
  const revealTarget = reveal ?? initialProject;

  const revealHash = useCallback(() => {
    const project = projectFromHash(window.location.hash, publicProjects);
    if (!project) return;
    // A direct project link wins over an earlier category selection.
    setFilter('all');
    setReveal({ id: project.id });
  }, []);

  useEffect(() => {
    const page = root.current;
    if (!page) return;
    window.addEventListener('hashchange', revealHash);

    const bridge = mountPortfolioBridge({ page, window });
    return () => {
      window.removeEventListener('hashchange', revealHash);
      bridge.cleanup();
    };
  }, [revealHash]);

  useEffect(() => {
    if (!revealTarget) return;
    // Wait until React has restored the unfiltered article before focusing it.
    const article = root.current?.querySelectorAll<HTMLElement>('article[data-project-group]');
    const card = Array.from(article || []).find(item => item.id === revealTarget.id);
    if (!card) return;
    const details = card.querySelector('details');
    if (details) details.open = true;
    details?.querySelector('summary')?.focus({ preventScroll: true });
    card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [revealTarget]);

  function reopenCurrentHash(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (window.location.hash !== event.currentTarget.getAttribute('href')) return;
    event.preventDefault();
    revealHash();
  }

  const visibleCount = publicProjects.filter(project => matchesProjectFilter(project, filter)).length;

  return (
    <div ref={root} className={`${styles.page}${embedded ? ` ${styles.embedded}` : ''}`}>
      <a className={styles.skip} href="#projects">Skip to projects</a>
      <header className={styles.topbar}>
        <p className={styles.printContext}>Development preview · public portfolio content</p>
        <a className={styles.identity} href="#home">AS<span>Abdullah Saleh</span></a>
        <span className={styles.location}>Brooklyn, NY</span>
        {!embedded && <a className={styles.roomLink} href="/studio">Enter the studio</a>}
      </header>
      <main>
        <section id="home" className={styles.intro} aria-labelledby="portfolio-heading">
          <div>
            <p className={styles.eyebrow}>SOFTWARE · COMMUNITY · PRACTICE</p>
            <h1 id="portfolio-heading">People <span>&gt;</span> profit.</h1>
            <p className={styles.lede}>I’m Abdullah, a software engineer and developer advocate working where technology meets collective possibility.</p>
          </div>
          <div className={styles.indexCard}>
            <span className={styles.eyebrow}>ON THIS DESK</span>
            <p>Tools to learn with.<br />Systems to build on.<br />Work that brings people together.</p>
            <a href="#projects">Explore selected work</a>
          </div>
        </section>
        <nav aria-label="Portfolio sections" className={styles.sectionNav}>
          <a href="#projects">01 / Projects</a><a href="#about">02 / About</a><a href="#contact">03 / Contact</a>
        </nav>
        <section id="projects" className={styles.work} aria-labelledby="projects-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>01 / SELECTED WORK</p>
            <h2 id="projects-heading">From ideas<br /> to practice.</h2>
            <p className={styles.workGuide}>Engineering, advocacy, and community work. Open a project for its scope, contribution, and public sources.</p>
          </div>
          <div className={styles.projects}>
            <div id="project-filters" className={styles.filters} hidden={!enhanced}>
              <div className={styles.filterButtons} role="group" aria-label="Filter selected work">
                {filters.map(item => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value}>{item.label}</button>)}
              </div>
              <p id="project-count" className={styles.projectCount} role="status" aria-live="polite" aria-atomic="true">{visibleCount} projects</p>
            </div>
            {publicProjects.map((project, index) => (
              <article key={project.id} id={project.id} className={styles.project} data-project-group={project.group} hidden={!matchesProjectFilter(project, filter)} aria-labelledby={`${project.id}-heading`}>
                <div className={styles.projectIdentity}>
                  <div className={styles.projectMeta}><span>{String(index + 1).padStart(2, '0')}</span><span>{project.category}</span></div>
                  <h3 id={`${project.id}-heading`}><a className={styles.projectTitleLink} href={`#${project.id}`} onClick={reopenCurrentHash}>{project.title} <span className={styles.projectLinkMark} aria-hidden="true">↘</span></a></h3>
                  <p className={styles.workType}><span>{project.status}</span><ExternalLink href={project.source}>{project.sourceLabel || 'Source notes'}</ExternalLink></p>
                </div>
                <div className={styles.projectBody}>
                  <p>{project.summary}</p>
                  <p className={styles.tags}>{project.tags}</p>
                  <details className={styles.projectNotes}>
                    <summary>Read project notes<span className={styles.srOnly}>: {project.noteTitle}</span></summary>
                    <div className={styles.projectNoteContent}>
                      <p className={styles.noteRole}>{project.role}</p>
                      {project.notes.map(note => <p key={note}>{note}</p>)}
                      {project.extraSource && <p><ExternalLink href={project.extraSource.href}>{project.extraSource.label}</ExternalLink></p>}
                      <ExternalLink href={project.source} className={styles.sourceLink}>Public source &amp; background</ExternalLink>
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="about" className={styles.about} aria-labelledby="about-heading">
          <p className={styles.eyebrow}>02 / ABOUT</p>
          <h2 id="about-heading">Build useful things.<br />Share what you learn.</h2>
          <div className={styles.aboutCopy}>
            <p>My work connects software engineering, machine learning, and community organizing. I care about how people understand technology, shape it together, and put it to use.</p>
            <p>I studied computer science at Brooklyn College, CUNY, graduating in 2023. My experience includes data science at IBM, software engineering at CVS Health, and developer advocacy at Habibi Tech.</p>
            <p>Beyond the code, I’ve organized with We Are STEM and For Our Liberation, and contributed to community-led initiatives including the Sudanese Resistance Front, Awlad Al Neel, and People &gt; Profit.</p>
          </div>
        </section>
        <section id="contact" className={styles.contact} aria-labelledby="contact-heading">
          <p className={styles.eyebrow}>03 / GET IN TOUCH</p>
          <h2 id="contact-heading">Let’s make<br />something useful.</h2>
          <a className={styles.email} href="mailto:noobianlabs@gmail.com">noobianlabs@gmail.com</a>
          <div className={styles.contactLinks}>
            <ExternalLink href="https://github.com/noobianlabs">GitHub</ExternalLink>
            <a href="/" target={embedded ? '_top' : undefined}>Original portfolio</a>
            <ExternalLink href="https://desktop-production-33b7.up.railway.app/">Original desktop</ExternalLink>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>Abdullah Saleh · People &gt; Profit</span>
        <a href="#home">Back to top <span aria-hidden="true">↑</span></a>
        <ExternalLink href="https://github.com/noobianlabs/Portfolio-next">Portfolio source &amp; credits</ExternalLink>
      </footer>
    </div>
  );
}
