import { JSX } from "react";
import { SubViewNavigation, SubViewParams } from "./AboutView";
import styles from './AboutView.module.css';
import Image from 'next/image';


function ProjectImage(props: { src: string, alt: string, label?: string, labelNumber?: number }) {
  const { src, alt, label, labelNumber } = props;

  return (<>
    <div className={styles['project-image-container']}>
      <Image
        src={src}
        alt={alt}
        fill
        quality={90}
        style={{ objectFit: 'contain' }}
        sizes="400px, 800px, 1024px"
      />
    </div>
    {label && <span className={styles['project-image-label']}><b>Label {labelNumber ?? 1}: </b>{label}</span>}
  </>
  );
}

function ProjectPage(props: { title: string, params: SubViewParams, content: JSX.Element }) {
  const params = props.params;

  function openContactApp() {
    params.manager.open('/Applications/Contact.app');
  }

  function englishContent() {
    const contact = (<>
      <p>If you have any questions or comments, please contact me via the <a onClick={() => openContactApp()} href='#contact'>contact application</a> or shoot me an email at <a href="mailto:noobianlabs@gmail.com">noobianlabs@gmail.com</a></p>
    </>);

    return { contact };
  }

  function dutchContent() {
    const contact = (<>
      <p>Als je opmerkingen of vragen hebt, neem contact met mij op via de <a onClick={() => openContactApp()} href='#contact'>contact applicatie</a> of schiet een mailtje naar met via <a href='mailto:noobianlabs@gmail.com'>noobianlabs@gmail.com</a></p>
    </>);

    return { contact };
  }

  const content = params.language === 'nl' ? dutchContent() : englishContent();
  const backToProjects = params.language === 'nl' ? 'Terug naar projecten' : 'Back to projects';

  return (<>
    <div data-subpage className={styles['subpage']}>
      {SubViewNavigation(params)}
      <div data-subpage-content className={styles['subpage-content']}>
        <h1>{props.title}</h1>
        <button onClick={() => params.changeParent('projects')} className={styles['button-link']}>{backToProjects}</button>
        {props.content}

        <h3>Contact</h3>
        {content.contact}

        <button onClick={() => params.changeParent('projects')} className={styles['button-link']}>{backToProjects}</button>
      </div>
    </div>
  </>);
}

export function ProjectThankYou(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>I would like to take a moment to thank the original developers who inspired and paved the way for this portfolio.</p>

        <h3>Henry Heffernan</h3>
        <p>
          Henry's incredible portfolio was a major inspiration for the visual style and interactive elements of this site. His work pushes the boundaries of what a personal website can be.<br />
          <a target="_blank" rel="noreferrer" href="https://henryheffernan.com/">Visit Henry's Portfolio</a>
        </p>

        <h3>Joey de Ruiter</h3>
        <p>
          Joey's technical expertise and original implementation of this portfolio's framework provided the solid foundation I built upon. His Unix-inspired design and virtual file system are masterpieces of web engineering.<br />
          <a target="_blank" rel="noreferrer" href="https://github.com/joeyderuiter/Portfolio-next">Visit Joey's Repository</a>
        </p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Ik wil graag een moment nemen om de originele ontwikkelaars te bedanken die dit portfolio hebben geïnspireerd en de weg hebben vrijgemaakt.</p>

        <h3>Henry Heffernan</h3>
        <p>
          Henry's ongelooflijke portfolio was een grote inspiratie voor de visuele stijl en interactieve elementen van deze site. Zijn werk verlegt de grenzen van wat een persoonlijke website kan zijn.<br />
          <a target="_blank" rel="noreferrer" href="https://henryheffernan.com/">Bezoek Henry's Portfolio</a>
        </p>

        <h3>Joey de Ruiter</h3>
        <p>
          Joey's technische expertise en originele implementatie van het framework van dit portfolio vormden de solide basis waarop ik heb voortgebouwd. Zijn op Unix geïnspireerde ontwerp en virtuele bestandssysteem zijn meesterwerken van webengineering.<br />
          <a target="_blank" rel="noreferrer" href="https://github.com/joeyderuiter/Portfolio-next">Bezoek Joey's Repository</a>
        </p>
      </div>
    );
  }

  let content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();

  return ProjectPage({ title: 'Thank You', content, params });
}

export function ProjectPortfolio2024(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>Somewhere in 2023 I decided it might be time to replace my portfolio website. As it was a long time ago that build my original one.</p>

        <p>After looking at some portfolio showcases of some other developers, I was very impressed by Henry Heffernan’s showcase (<a rel="noreferrer" target="_blank" href="https://henryheffernan.com/">https://henryheffernan.com/</a>). And decided to build something similar to it. Although I wanted to build a more Unix like operating system.</p>

        <p>So I started to work on my first prototype. My prototype was an attempt to render the scene with a “cutout” shader, so it would display the content of the monitor through the 3D scene. After a successful attempt, I decided to work on the real thing.</p>

        <ProjectImage src="/images/project-portfolio.png" alt="Portfolio image" label="Portfolio at the end of the development cycle" />

        <p>Now building a portfolio website is a great opportunity to try out some new technologies, so for this project I decided to try out React within the NextJS framework. And now after I finished it, I would say that the choice is good. I had some troubles at first with the way React has to handle its data and the rules of hooks, but at the end I was quite comfortable with it.</p>

        <p>One of the things I really wanted to build was a virtual file system, where the user would be able to actually drag and drop files like a real operating system. This file system would also be the corner stone on how the user would interact with the website, just like many other operating systems.</p>

        <p>Another thing I really wanted to get right, was browser support and mobile support. Due to the weird nature of the how this portfolio website works, it landed itself in many not well supported use cases of a browser. This led to many browser specific ways of handling certain features. Mobile support was a bit hard to do, as I needed a custom implementation for zooming in and out of the website. Due to some technical difficulties zooming has a delayed effect.</p>

        <p>This project was very fun to build, but it took way longer than originally expected. Funny enough, this wasn’t due to the programming. This was mainly due to me under estimating how hard graphic design and 3D modelling would be, and me wanting to deliver a high quality product and not just some ”programmer art”.</p>

        <h3>Technology</h3>
        <p>
          React, NextJS, TypeScript and webgl<br />
          <a target="blank" rel="noreferrer" href="https://github.com/noobianlabs/Portfolio-next">Link</a> to the code of the project.
        </p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Ergens in 2023 besloot ik dat het tijd was voor een nieuwe portfolio website, aangezien het een lange tijd gelden was dat ik mijn originele had gebouwd.</p>

        <p>Na een tijdje rond te zoeken naar portfolio’s van andere developers was ik erg geïnspireerd door Henry Heffernan’s showcase (<a rel="noreferrer" target="_blank" href="https://henryheffernan.com/">https://henryheffernan.com/</a>). En besloot iets vergelijkbaars te bouwen, enkel wouw ik meer een Unix geïnspireerd systeem ontwikkelen.</p>

        <p>Dus besloot ik te werken aan een eerste prototype, het doel van dit prototype was om te testen of het mogelijk zou zijn om de scene te renderen doormiddel van een “cutout" shader. Zodat het de content op de monitor zou tonen in de 3D scene. Na een succesvolle prototype ging ik te werk aan de uiteindelijke versie.</p>

        <ProjectImage src="/images/project-portfolio.png" alt="Portfolio afbeelding" label="Portfolio aan het einde van de ontwikkel cyclus" />

        <p>Nu kwam ik aan bij het bouwen van de portfolio website, dit is altijd een goeie mogelijkheid om nieuwe technologieën uit te proberen. Dus voor dit project besloot ik om React uit te proberen binnen het NextJS framework. En nu dat het project is afgerond, ben ik blij met de keuze die ik heb gemaakt. Aan het begin had ik wat kleine problemen met hoe React omgaat met data en hooks, maar aan het einde was ik er erg comfortabel mee.</p>

        <p>Een ding die ik erg graag wouw bouwen was een virtuele file system, waarbij de gebruikers ook daadwerkelijk bestanden kunnen drag en droppen net zoals een operating systeem.</p>

        <p>Een ander ding waar ik erg veel tijd aan heb besteed was browser support en mobiele support. Doordat mijn portfolio website een beetje buiten de scope valt van een normale website was niet iedere browser even blij met de implementatie. Dit leidde tot enkele browser specifieke implementaties voor het afhandelen van enkele features. Mobiele support was ook lastig om te doen, aangezien ik een eigen implementatie voor het in en uit zoemen van de website moest maken. Door enkele technische problemen heeft het zoomen een uitgesteld effect.</p>

        <p>Dit project was erg leuk om te bouwen, alleen nam veel meer tijd in dat origineel geanticipeerd. Grappig genoeg kwam dit niet door het programmeren, maar voornamelijk doordat ik niet had verwacht dat het grafisch ontwerp en 3D modelling zo tijd intensief zou zijn.</p>

        <h3>Technologie</h3>
        <p>
          React, NextJS, TypeScript en webgl<br />
          <a target="blank" rel="noreferrer" href="https://github.com/noobianlabs/Portfolio-next">Link</a> naar de code van het project.
        </p>
      </div>
    );
  }

  let content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();

  return ProjectPage({ title: 'Portfolio 2024', content, params });
}


export function ProjectHabibiTechDemos(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>At Habibi Tech, I develop and deliver engaging demos on using LLMs and building RAG systems. These demos are tailored to the unique needs of our predominantly Muslim community, focusing on culturally relevant applications and technological innovation.</p>
        <p>One of my key roles is facilitating discussions on the impact of AI and fostering collaborative learning through Demo Day events.</p>
        <h3>Technology</h3>
        <p>Python, LLMs, RAG systems, Hugging Face, Gradio</p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Bij Habibi Tech ontwikkel en lever ik boeiende demo&apos;s over het gebruik van LLM&apos;s en het bouwen van RAG-systemen. Deze demo&apos;s zijn toegesneden op de unieke behoeften van onze overwegend moslimgemeenschap, met een focus op cultureel relevante toepassingen en technologische innovatie.</p>
        <p>Een van mijn hoofdtaken is het faciliteren van discussies over de impact van AI en het stimuleren van gezamenlijk leren via Demo Day-evenementen.</p>
        <h3>Technologie</h3>
        <p>Python, LLMs, RAG-systemen, Hugging Face, Gradio</p>
      </div>
    );
  }

  const content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();
  return ProjectPage({ title: 'Habibi Tech Demos', content, params });
}

export function ProjectCVSPrototypes(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>During my time at CVS Health, I assisted with AI/ML prototypes leveraging modern tools for knowledge retrieval and meeting summarization. I explored advanced LLM techniques such as retrieval-augmented generation and prompt engineering.</p>
        <p>I also participated in a rotational program supporting feature development and maintenance across Spring Boot and Next.js teams.</p>
        <h3>Technology</h3>
        <p>Next.js, Spring Boot, Ollama, Llama Index, Hugging Face, Gradio</p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Tijdens mijn tijd bij CVS Health hielp ik bij AI/ML-prototypes met behulp van moderne tools voor het ophalen van kennis en het samenvatten van vergaderingen. Ik verkende geavanceerde LLM-technieken zoals retrieval-augmented generation en prompt engineering.</p>
        <p>Ik nam ook deel aan een rotatieprogramma ter ondersteuning van functieontwikkeling en onderhoud in Spring Boot- en Next.js-teams.</p>
        <h3>Technologie</h3>
        <p>Next.js, Spring Boot, Ollama, Llama Index, Hugging Face, Gradio</p>
      </div>
    );
  }

  const content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();
  return ProjectPage({ title: 'CVS AI/ML Prototypes', content, params });
}

export function ProjectForOurLiberation(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>As Chairperson of For Our Liberation, I developed and maintained the organization&apos;s website to ensure seamless technological operations for our mutual aid projects in Brooklyn.</p>
        <p>Beyond technical work, I organized programs and skillshares to meet community needs and facilitated discussions on collective struggle and technology&apos;s impact.</p>
        <h3>Technology</h3>
        <p>Web Development (Next.js/React), Community Organizing</p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Als voorzitter van For Our Liberation heb ik de website van de organisatie ontwikkeld en onderhouden om naadloze technologische operaties te garanderen voor onze wederzijdse hulpprojecten in Brooklyn.</p>
        <p>Naast technisch werk organiseerde ik programma&apos;s en skillshares om aan de behoeften van de gemeenschap te voldoen en faciliteerde ik discussies over collectieve strijd en de impact van technologie.</p>
        <h3>Technologie</h3>
        <p>Webontwikkeling (Next.js/React), Gemeenschapsorganisatie</p>
      </div>
    );
  }

  const content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();
  return ProjectPage({ title: 'For Our Liberation', content, params });
}

export function ProjectIBMMaximo(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>During my internship at IBM, I prototyped an automated Repair-or-Replace decision system for Maximo Enterprise Asset Management. This system aimed to optimize lifecycle management of enterprise assets through data-driven insights.</p>
        <h3>Technology</h3>
        <p>Data Science, Python, Maximo EAM</p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Tijdens mijn stage bij IBM heb ik een prototype gemaakt voor een geautomatiseerd Repair-or-Replace-beslissingssysteem voor Maximo Enterprise Asset Management. Dit systeem was bedoeld om de levenscyclus van bedrijfsmiddelen te optimaliseren via data-gedreven inzichten.</p>
        <h3>Technologie</h3>
        <p>Data Science, Python, Maximo EAM</p>
      </div>
    );
  }

  const content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();
  return ProjectPage({ title: 'IBM Maximo AI', content, params });
}

export function ProjectSudaneseResistance(params: SubViewParams) {
  function RenderEnglishContent() {
    return (
      <div>
        <p>I am currently involved with the Sudanese Resistance Front and Awlad Al Neel, working on political advocacy and community-led tech initiatives. We focus on leveraging technology to amplify underrepresented voices and support grassroots organizing.</p>
        <h3>Focus</h3>
        <p>Political Advocacy, Community Tech, Human Rights</p>
      </div>
    );
  }

  function RenderDutchContent() {
    return (
      <div>
        <p>Ik ben momenteel betrokken bij het Sudanese Resistance Front en Awlad Al Neel, waarbij ik werk aan politieke belangenbehartiging en door de gemeenschap geleide tech-initiatieven. We richten ons op het gebruik van technologie om ondervertegenwoordigde stemmen te versterken.</p>
        <h3>Focus</h3>
        <p>Politieke Belangenbehartiging, Community Tech, Mensenrechten</p>
      </div>
    );
  }

  const content = params.language === 'nl' ? RenderDutchContent() : RenderEnglishContent();
  return ProjectPage({ title: 'Sudanese Resistance Front', content, params });
}
