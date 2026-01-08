import { WindowProps } from "@/components/WindowManagement/WindowCompositor";
import Image from 'next/image';
import styles from './SkillsView.module.css';
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { SkillsContent } from "@/lib/content";

function SkillEntry(props: { language: string, icon: { src: string, alt: string } }) {
  const { language, icon } = props;

  return (<>
    <div className={styles['language-entry']}>
      <Image
        quality={100}
        draggable={false}
        width={40}
        height={40}
        src={icon.src}
        alt={icon.alt}
      />
      <span>{language}</span>
    </div>
  </>);
}

export default function SkillsView(props: WindowProps) {
  const { t } = useTranslation('common');
  const [skillsContent, setSkillsContent] = useState<SkillsContent | undefined>();

  useEffect(() => {
    fetch('/api/content/skills')
      .then(res => res.json())
      .then(data => setSkillsContent(data))
      .catch(err => console.error('Error fetching skills content:', err));
  }, []);

  return (
    <div className="content-outer">
      <div className="content">
        <div className='content-inner'>
          <div className={styles['skills-content']}>
            {skillsContent?.categories.map((category) => (
              <div key={category.name}>
                <h1>{category.name === "Programming Languages" ? t("skills.programming_languages") :
                  category.name === "Frameworks" ? t("skills.frameworks") :
                    category.name === "Tools" ? t("skills.tools") : category.name}</h1>
                <ul>
                  {category.skills.map((skill) => (
                    <li key={skill.name}>
                      <SkillEntry language={skill.name} icon={{ src: skill.icon, alt: skill.name }} />
                    </li>
                  ))}
                </ul>
              </div>
            )) || <p>Loading skills...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
