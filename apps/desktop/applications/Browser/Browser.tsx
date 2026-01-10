import { LocalWindowCompositor } from "@/components/WindowManagement/LocalWindowCompositor";
import { WindowContext, Window, WindowApplication } from "@/components/WindowManagement/WindowCompositor";
import { ApplicationEvent, ApplicationOpenEvent } from "../ApplicationEvents";
import { Application, ApplicationConfig, MenuEntry } from "../ApplicationManager";
import { LocalApplicationManager } from "../LocalApplicationManager";
import dynamic from 'next/dynamic';
import { SystemAPIs } from "@/components/OperatingSystem";

const View = dynamic(() => import('./BrowserView')) as WindowApplication;

export class BrowserConfig implements ApplicationConfig {
    public readonly displayName = 'Browser';
    public readonly dockPriority = null;
    public readonly path = '/Applications/';
    public readonly appName = 'Browser.app';
    public readonly appIcon = { src: '/icons/world-icon.png', alt: 'Browser' };
    public readonly entrypoint = (
        compositor: LocalWindowCompositor,
        manager: LocalApplicationManager,
        apis: SystemAPIs
    ) => new BrowserApplication(compositor, manager, apis);
}

export const browserConfig = new BrowserConfig();

export class BrowserApplication extends Application {
    config(): ApplicationConfig {
        return browserConfig;
    }

    menuEntries(): MenuEntry[] {
        return [{
            displayOptions: { boldText: true },
            name: 'Browser',
            items: []
        }]
    }

    private createNewWindow(event: ApplicationOpenEvent): Window {
        const y = 50;
        const width = window.innerWidth * 0.8;
        const height = window.innerHeight * 0.8;
        const x = (window.innerWidth - width) / 2;

        return this.compositor.open({
            x, y,
            height,
            width,
            title: "Browser",
            application: this,
            args: event.args,
            generator: () => { return View; }
        });
    }

    on(event: ApplicationEvent, windowContext?: WindowContext): void {
        this.baseHandler(event, windowContext);

        if (event.kind === 'application-open') {
            this.createNewWindow(event);
        };

        if (event.kind === 'application-quit') {
            if (!windowContext) { return; }
        }
    }
}
