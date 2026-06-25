import { useEffect } from "react";

const APP_NAME = "TicketRush";

export function useDocumentTitle(
  title: string,
  options: { exact?: boolean } = {},
) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = options.exact ? title : `${title} | ${APP_NAME}`;

    return () => {
      document.title = prevTitle;
    };
  }, [title, options.exact]);
}

export default useDocumentTitle;
