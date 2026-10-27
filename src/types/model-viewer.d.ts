import type React from 'react';

export interface ModelViewerTexture {
  name?: string;
}

export interface ModelViewerMaterial {
  pbrMetallicRoughness?: {
    baseColorTexture?: {
      setTexture: (texture: ModelViewerTexture | null) => void;
    };
  };
}

export interface ModelViewerElement extends HTMLElement {
  src: string;
  alt?: string;
  cameraOrbit: string;
  fieldOfView?: string;
  exposure?: string | number;
  shadowIntensity?: string | number;
  environmentImage?: string;
  interactionPrompt?: string;
  loaded?: boolean;
  model?: {
    materials: ModelViewerMaterial[];
  };
  createTexture?: (url: string) => Promise<ModelViewerTexture>;
}

type ModelViewerJSXProps = React.DetailedHTMLProps<
  React.HTMLAttributes<ModelViewerElement>,
  ModelViewerElement
> & {
  src?: string;
  alt?: string;
  'camera-controls'?: boolean | string;
  'disable-zoom'?: boolean | string;
  'shadow-intensity'?: string | number;
  'environment-image'?: string;
  exposure?: string | number;
  'interaction-prompt'?: string;
  'camera-orbit'?: string;
  'field-of-view'?: string;
  'auto-rotate'?: boolean | string;
  'rotation-per-second'?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  ref?: React.Ref<ModelViewerElement>;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSXProps;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSXProps;
    }
  }
}
