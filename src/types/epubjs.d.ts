// Type declarations for epubjs
declare module "epubjs" {
  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
  }

  export interface Navigation {
    toc: NavItem[];
  }

  export interface Spine {
    items: SpineItem[];
  }

  export interface SpineItem {
    href: string;
    idref: string;
    index: number;
    linear: boolean;
  }

  export interface PackagingMetadataObject {
    title: string;
    creator: string;
    description: string;
    pubdate: string;
    publisher: string;
    identifier: string;
    language: string;
    rights: string;
    modified_date: string;
    layout: string;
    orientation: string;
    flow: string;
    viewport: string;
    spread: string;
  }

  export interface Location {
    start: { cfi: string; displayed: { page: number; total: number } };
    end: { cfi: string; displayed: { page: number; total: number } };
    atStart: boolean;
    atEnd: boolean;
  }

  export interface Contents {
    content: Document;
    sectionIndex: number;
    cfiBase: string;
  }

  export interface Rendition {
    display(target?: string | number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    destroy(): void;
    currentLocation(): Location;
    themes: {
      fontSize(size: string): void;
      font(name: string): void;
      override(name: string, value: string): void;
      register(name: string, styles: object): void;
      select(name: string): void;
    };
  }

  export interface Book {
    ready: Promise<void>;
    loaded: {
      metadata: Promise<PackagingMetadataObject>;
      spine: Promise<Spine>;
      manifest: Promise<any>;
      navigation: Promise<Navigation>;
      cover: Promise<string>;
    };
    coverUrl(): Promise<string | null>;
    renderTo(
      element: Element | string,
      options?: {
        width?: string | number;
        height?: string | number;
        ignoreClass?: string;
        manager?: string;
        view?: string;
        flow?: string;
        layout?: string;
        spread?: string;
        minSpreadWidth?: number;
        stylesheet?: string;
        script?: string;
        allowScriptedContent?: boolean;
        snap?: boolean;
      }
    ): Rendition;
    load(path: string): Promise<Document | string>;
    destroy(): void;
  }

  function ePub(
    url: string | ArrayBuffer,
    options?: {
      requestMethod?: (url: string, type: string, withCredentials: boolean) => Promise<ArrayBuffer>;
      canonical?: (path: string) => string;
      openAs?: string;
    }
  ): Book;

  export default ePub;
}
