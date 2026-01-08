import { WindowProps } from '@/components/WindowManagement/WindowCompositor';
import { JSX, useEffect, useRef, useState } from 'react';
import styles from './AboutView.module.css';
import { BaseApplicationManager } from '../ApplicationManager';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { ProjectCVSPrototypes, ProjectForOurLiberation, ProjectHabibiTechDemos, ProjectIBMMaximo, ProjectPortfolio2024, ProjectThankYou, ProjectSudaneseResistance } from './Projects';
import { ScreenResolution } from '@/apis/Screen/ScreenService';
import { AboutContent, ExperienceEntry } from '@/lib/content';

type SubView = (
  'home' |
  'about' |
  'experience' |
  'projects' |
  'project-thank-you' |
  'project-portfolio-2024' |
  'project-habibi-tech' |
  'project-cvs-prototypes' |
  'project-for-our-liberation' |
  'project-ibm-maximo' |
  'project-sudanese-resistance' |
  'contact'
);

export type SubViewParams = {
  needsMobileView: boolean,
  manager: BaseApplicationManager,
  changeParent: (view: SubView) => void,
  translate: TFunction,
  language: string,
  aboutContent?: AboutContent,
  experienceEntries?: ExperienceEntry[]
}

function Contact(props: { manager: BaseApplicationManager, language: string, email?: string }) {
  function openContactApp() {
    props.manager.open('/Applications/Contact.app');
  }

  const email = props.email || "noobianlabs@gmail.com";

  function englishContent() {
    return (<>
      <p>If you have any questions or comments, please contact me via the <a onClick={() => openContactApp()} href='#contact'>contact application</a> or shoot me an email at <a href={`mailto:${email}`}>{email}</a></p>
    </>);
  }

  function dutchContent() {
    return (<>
      <p>Als je opmerkingen of vragen hebt, neem contact met mij op via de <a onClick={() => openContactApp()} href='#contact'>contact applicatie</a> of schiet een mailtje naar met via <a href={`mailto:${email}`}>{email}</a></p>
    </>);
  }

  return props.language === 'nl' ? dutchContent() : englishContent();
}

function DownloadCv(props: { translate: TFunction }) {
  const t = props.translate;

  return (<>
    <div className={styles['download-cv']}>
      <hr className={styles['about-hr']} />
      <div className={styles['download-content']}>
        <img src="/icons/printer.png" alt="Printer" draggable={false} />
        <div>
          <h2>{t("about.download_cv.title")}</h2>
          <a target='_blank' href={t("about.download_cv.download_link")}>{t("about.download_cv.instruction")}</a>
        </div>
      </div>
      <hr className={styles['about-hr']} />
    </div>
  </>);
}

function HomeSubView(params: SubViewParams) {
  const t = params.translate;

  const mobileClass = params.needsMobileView ? styles['mobile'] : '';
  const name = params.aboutContent?.name || "Abdullah Saleh";
  const title = params.aboutContent?.title || "PEOPLE > PROFIT";

  return (<>
    <div className={styles['subpage-home']}>
      <h1 className={styles['home-title']}>{name}</h1>
      <h3 className={styles['home-subtitle']}>{title}</h3>

      <div className={styles['home-button-container']}>
        <button className={`${styles['home-button']} system-button ${mobileClass}`} onClick={() => params.changeParent('about')}>{t("about.navigation.about")}</button>
        <button className={`${styles['home-button']} system-button ${mobileClass}`} onClick={() => params.changeParent('experience')}>{t("about.navigation.experience")}</button>
        <button className={`${styles['home-button']} system-button ${mobileClass}`} onClick={() => params.changeParent('projects')}>{t("about.navigation.projects")}</button>
        <button className={`${styles['home-button']} system-button ${mobileClass}`} onClick={() => params.changeParent('contact')}>{t("about.navigation.contact")}</button>
      </div>
    </div>
  </>)
}

export function SubViewNavigation(params: SubViewParams) {
  const t = params.translate;

  const mobileClass = params.needsMobileView ? styles['mobile'] : '';

  const nameParts = params.aboutContent?.name.split(' ') || ['Abdullah', 'Saleh'];

  return (<>
    <div className={styles['navigation']}>
      <div>
        {nameParts.map((part, i) => (
          <span key={`Part ${i}`} className={styles['logo-part']}>{part}</span>
        ))}
      </div>

      <div className={`${styles['navigation-button-container']} ${mobileClass}`}>
        <button className='system-button' onClick={() => params.changeParent('home')}>{t("about.navigation.home")}</button>
        <button className='system-button' onClick={() => params.changeParent('about')}>{t("about.navigation.about")}</button>
        <button className='system-button' onClick={() => params.changeParent('experience')}>{t("about.navigation.experience")}</button>
        <button className='system-button' onClick={() => params.changeParent('projects')}>{t("about.navigation.projects")}</button>
        <button className='system-button' onClick={() => params.changeParent('contact')}>{t("about.navigation.contact")}</button>
      </div>
    </div>
  </>)
}

function AboutSubView(params: SubViewParams) {
  if (params.aboutContent) {
    return (
      <div data-subpage className={styles['subpage']}>
        {SubViewNavigation(params)}
        <div data-subpage-content className={styles['subpage-content']}>
          <div
            className={styles['markdown-content']}
            dangerouslySetInnerHTML={{ __html: params.aboutContent.contentHtml }}
          />
          <DownloadCv translate={params.translate} />
        </div>
      </div>
    );
  }

  // Fallback if content loading fails or still in progress
  return (
    <div data-subpage className={styles['subpage']}>
      {SubViewNavigation(params)}
      <div data-subpage-content className={styles['subpage-content']}>
        <p>Loading content...</p>
      </div>
    </div>
  );
}

function ExperienceSubView(params: SubViewParams) {
  const t = params.translate;

  const entries = params.experienceEntries || [];

  return (<>
    <div data-subpage className={styles['subpage']}>
      {SubViewNavigation(params)}
      <div data-subpage-content className={styles['subpage-content']}>
        <h1 className={styles['page-h1']}>{t("about.navigation.experience")}</h1>

        {entries.length === 0 ? <p>Loading experience...</p> : entries.map((entry) => (
          <div key={entry.slug} className={styles['experience-entry']}>
            <h2>{entry.dateRange} - {entry.title}{entry.role ? (` (${entry.role})`) : ''}</h2>
            <div
              className={styles['markdown-content']}
              dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
            />
          </div>
        ))}

        <DownloadCv translate={params.translate} />

        <Contact email={params.aboutContent?.email} manager={params.manager} language={params.language} />
      </div>
    </div>
  </>);
}

function ProjectsSubView(params: SubViewParams) {
  const t = params.translate;

  function ProjectButton(name: string, target: SubView, imageUrl: string) {
    return (<>
      <button className={styles['project-button']} onClick={() => params.changeParent(target)}>
        <div>
          <img src={imageUrl} alt={`${target} thumbnail`} width={25} height={25} />
        </div>
        <span>{name}</span>
      </button>
    </>);
  }

  return (<>
    <div data-subpage className={styles['subpage']}>
      {SubViewNavigation(params)}
      <div data-subpage-content className={styles['subpage-content']}>
        <h1 className={styles['page-h1']}>{t("about.navigation.projects")}</h1>

        <h2>2024</h2>
        <ul>
          <li>{ProjectButton('Habibi Tech Demos', 'project-habibi-tech', '/icons/project-habibi-tech.png')}</li>
          <li>{ProjectButton('Thank You', 'project-thank-you', '/icons/project-thank-you.png')}</li>
          <li>{ProjectButton('Portfolio 2024', 'project-portfolio-2024', '/icons/project-portfolio-2024.png')}</li>
        </ul>

        <h2>2023 - 2024</h2>
        <ul>
          <li>{ProjectButton('CVS AI/ML Prototypes', 'project-cvs-prototypes', '/icons/project-cvs-health.png')}</li>
        </ul>

        <h2>2021 - 2024</h2>
        <ul>
          <li>{ProjectButton('For Our Liberation', 'project-for-our-liberation', '/icons/project-for-our-liberation.png')}</li>
        </ul>

        <h2>2019</h2>
        <ul>
          <li>{ProjectButton('IBM Maximo AI', 'project-ibm-maximo', '/icons/project-ibm.png')}</li>
        </ul>

        <h2>Present</h2>
        <ul>
          <li>{ProjectButton('Sudanese Resistance', 'project-sudanese-resistance', '/icons/project-resistance.png')}</li>
        </ul>
      </div>
    </div>
  </>);
}

function RenderSubView(view: SubView, params: SubViewParams): JSX.Element {
  switch (view) {
    case 'home': return HomeSubView(params);
    case 'about': return AboutSubView(params);
    case 'experience': return ExperienceSubView(params);
    case 'projects': return ProjectsSubView(params);
    case 'project-thank-you': return ProjectThankYou(params);
    case 'project-portfolio-2024': return ProjectPortfolio2024(params);
    case 'project-habibi-tech': return ProjectHabibiTechDemos(params);
    case 'project-cvs-prototypes': return ProjectCVSPrototypes(params);
    case 'project-for-our-liberation': return ProjectForOurLiberation(params);
    case 'project-ibm-maximo': return ProjectIBMMaximo(params);
    case 'project-sudanese-resistance': return ProjectSudaneseResistance(params);
  }

  return <></>;
}

export default function AboutApplicationView(props: WindowProps) {
  const { application, windowContext } = props;

  const [subView, setSubView] = useState<SubView>('home');
  const [needsMobileView, setNeedsMobileView] = useState<boolean>(false);
  const [aboutContent, setAboutContent] = useState<AboutContent | undefined>();
  const [experienceEntries, setExperienceEntries] = useState<ExperienceEntry[] | undefined>();

  const { t, i18n } = useTranslation("common");

  const apis = application.apis;

  const contentParent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch about content
    fetch('/api/content/about')
      .then(res => res.json())
      .then(data => setAboutContent(data))
      .catch(err => console.error('Error fetching about content:', err));

    // Fetch experience entries
    fetch('/api/content/experience')
      .then(res => res.json())
      .then(data => setExperienceEntries(data))
      .catch(err => console.error('Error fetching experience content:', err));
  }, []);

  function resetSubPageScroll() {
    if (!contentParent.current) { return; }

    const subViewParent = contentParent.current;
    const subViewParentChildren = Array.from(subViewParent.children);

    const subView = subViewParentChildren.find(x => x.hasAttribute('data-subpage'));
    if (!subView) { return; }

    const subViewChildren = Array.from(subView.children);

    const contentView = subViewChildren.find(x => x.hasAttribute('data-subpage-content'));

    if (!contentView) { return; }
    contentView.scrollTop = 0;
  }

  function onScreenChangeListener(resolution: ScreenResolution): void {
    setNeedsMobileView(resolution.isMobileDevice());
  }

  useEffect(() => {
    const unsubscribe = apis.screen.subscribe(onScreenChangeListener);

    const resolution = apis.screen.getResolution();
    if (resolution) { onScreenChangeListener(resolution); }

    return () => {
      unsubscribe();
    }
  }, []);

  useEffect(() => {
    resetSubPageScroll();
  }, [subView]);

  function changeParent(view: SubView) {
    if (view === 'contact') {
      application.on({ kind: 'about-open-contact-event' }, windowContext);
      return;
    }

    setSubView(view);
  }

  return (
    <div className="content-outer">
      <div className="content">
        <div className='content-inner' ref={contentParent}>
          {RenderSubView(subView,
            {
              needsMobileView,
              manager: application.manager,
              changeParent,
              translate: t,
              language: i18n.language,
              aboutContent,
              experienceEntries
            }
          )}
        </div>
      </div>
    </div>
  )
}