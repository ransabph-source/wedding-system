import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "הצהרת נגישות | I R Sidurim",
};

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="הצהרת נגישות"
      intro="אנו רואים חשיבות רבה במתן שירות שוויוני ונגיש לכלל המשתמשים, לרבות אנשים עם מוגבלות."
      sections={[
        {
          title: "תקן הנגישות",
          body: (
            <p>
              אנו פועלים להנגיש את המערכת בהתאם לתקן הישראלי ת&quot;י 5568, ברמת AA.
            </p>
          ),
        },
        {
          title: "תוסף נגישות",
          body: (
            <>
              <p>
                באתר מותקן תוסף נגישות, הזמין בכל עמוד דרך כפתור ♿ שבצד המסך. התוסף
                מאפשר:
              </p>
              <ul className="list-disc space-y-1 pr-5">
                <li>הגדלת טקסט</li>
                <li>ניגודיות גבוהה</li>
                <li>הדגשת קישורים</li>
              </ul>
              <p>ההגדרות נשמרות בדפדפן ונשארות פעילות במעבר בין עמודים.</p>
            </>
          ),
        },
        {
          title: "אחראי הנגישות",
          body: (
            <>
              <p>
                אחראי הנגישות: <strong>רן סבג</strong>.
              </p>
              <p>לכל בעיה או בקשה בנושא נגישות, ניתן לפנות אלינו ונשמח לסייע:</p>
              <ul className="space-y-1">
                <li>
                  דוא&quot;ל:{" "}
                  <a href="mailto:ransabph@gmail.com" className="text-indigo-700 underline underline-offset-4">
                    ransabph@gmail.com
                  </a>
                </li>
                <li>
                  טלפון:{" "}
                  <a href="tel:+972505990831" dir="ltr" className="text-indigo-700 underline underline-offset-4">
                    050-5990831
                  </a>
                </li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
