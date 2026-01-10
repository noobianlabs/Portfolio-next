import React, { useState, useRef, useEffect } from 'react';
import styles from './BrowserView.module.css';
import { WindowProps } from '@/components/WindowManagement/WindowCompositor';

const BrowserView = ({ windowContext, application, args }: WindowProps) => {
    const [url, setUrl] = useState('https://www.google.com/search?igu=1');
    const [inputUrl, setInputUrl] = useState('https://www.google.com/search?igu=1');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleNavigate = (e: React.FormEvent) => {
        e.preventDefault();
        let newUrl = inputUrl;
        if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
            newUrl = 'https://' + newUrl;
        }
        setUrl(newUrl);
        setInputUrl(newUrl);
    };

    const handleReload = () => {
        if (iframeRef.current) {
            iframeRef.current.src = url;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.buttonGroup}>
                    <button className="header-button" title="Back">
                        <img src="/icons/prev.png" alt="Back" />
                    </button>
                    <button className="header-button" title="Forward">
                        <img src="/icons/next.png" alt="Forward" />
                    </button>
                    <button className="header-button" title="Reload" onClick={handleReload}>
                        ⟳
                    </button>
                </div>
                <form className={styles.addressBar} onSubmit={handleNavigate}>
                    <input
                        type="text"
                        className="system-text-input"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                    />
                </form>
                <div className={styles.status}>
                    <button className="header-button">Go</button>
                </div>
            </div>
            <div className={styles.content}>
                <iframe
                    ref={iframeRef}
                    src={url}
                    className={styles.iframe}
                    title="Browser Content"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
            </div>
        </div>
    );
};

export default BrowserView;
