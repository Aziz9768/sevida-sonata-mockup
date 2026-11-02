import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageContainer } from "sevida-ui";
import { useEffect } from "react";

/**
 * Version 7: the app's "Page not found" page, with a way back to Analytics.
 * Before, a wrong measure address showed the wrong measure and an unknown address jumped to the home page without a word.
 */
export function NotFoundPageV7({ what }: { what?: string }) {
  const nav = useNavigate();
  useEffect(() => {
    const before = document.title;
    document.title = "Page Not Found, Sevida";
    return () => {
      document.title = before;
    };
  }, []);
  return (
    <PageContainer title="Page Not Found" titleVariant="overview">
      <Card>
        <EmptyState
          title={what ?? "There is nothing at this address"}
          description="The address may have a typo, or the page may have moved. Go back to the Analytics Overview and pick a measure from there."
          action={<Button onClick={() => nav("/dashboards")}>Back to Analytics Overview</Button>}
        />
      </Card>
    </PageContainer>
  );
}

export default NotFoundPageV7;
