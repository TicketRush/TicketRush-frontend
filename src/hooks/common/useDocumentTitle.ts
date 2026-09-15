import { useEffect } from "react";

const APP_NAME = "TicketRush";

export function useDocumentTitle(
  title: string,
  options: { exact?: boolean } = {},
) {
  useEffect(() => {
    document.title = options.exact ? title : `${title} | ${APP_NAME}`;
  }, [title, options.exact]);
}

export default useDocumentTitle;
