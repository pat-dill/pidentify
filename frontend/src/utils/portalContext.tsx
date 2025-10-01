"use client";

import {
  createContext,
  Fragment,
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";

import { v4 as uuidv4 } from "uuid";

interface IPortalData {
  pushContent: (id: string, content?: ReactNode) => void;
  content: Record<string, ReactNode>;
}

export function createPortalContext() {
  const rawContext = createContext<IPortalData>(undefined!);

  const portalContext = {
    Provider({ children, host }: { children?: ReactNode; host?: boolean }) {
      const [content, setContent] = useState<Record<string, ReactNode>>({});

      const pushContent = useCallback((id: string, content?: ReactNode) => {
        setContent((prev) => {
          const newContent = {
            ...prev,
            [id]: content,
          };

          if (!content) {
            delete newContent[id];
          }

          return newContent;
        });
      }, []);

      const ctxVal: IPortalData = {
        pushContent,
        content,
      };

      return (
        <rawContext.Provider value={ctxVal}>
          {host && <portalContext.Host />}
          {children}
        </rawContext.Provider>
      );
    },

    Host() {
      const { content } = useContext(rawContext);

      return (
        <>
          {Object.entries(content).map(([id, node]) => {
            return <Fragment key={id}>{node}</Fragment>;
          })}
        </>
      );
    },

    Portal({ children }: { children?: ReactNode }) {
      const [id] = useState<string>(uuidv4());
      const { pushContent } = useContext(rawContext);

      useLayoutEffect(() => {
        pushContent(id, children);
      }, [children]);

      useLayoutEffect(() => {
        return () => {
          pushContent(id, undefined);
        };
      }, []);

      return null;
    },
  };

  return portalContext;
}
