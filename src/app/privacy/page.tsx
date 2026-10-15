import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | I R Sidurim",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="מדיניות פרטיות"
      intro="אנו מכבדים את פרטיותכם ואת פרטיות המוזמנים שלכם. להלן פירוט האופן שבו אנו אוספים ומשתמשים במידע."
      sections={[
        {
          title: "המידע הנאסף",
          body: (
            <>
              <p>אנו אוספים את המידע הבא:</p>
              <ul className="list-disc space-y-1 pr-5">
                <li>שמות</li>
                <li>מספרי טלפון</li>
                <li>תשובות הגעה</li>
              </ul>
              <p>המידע נאסף ומשמש לצורך תפעול האירוע בלבד.</p>
            </>
          ),
        },
        {
          title: "צד שלישי",
          body: (
            <p>
              המידע אינו נמכר לאיש. עם זאת, הוא מועבר באופן טכני דרך שרתי Meta (WhatsApp)
              לצורך שליחת ההודעות.
            </p>
          ),
        },
        {
          title: "אבטחה",
          body: (
            <p>
              הנתונים נשמרים בשרתי המערכת עד לאחר מועד האירוע, ונמחקים או מאובטחים לאחר
              מכן.
            </p>
          ),
        },
      ]}
    />
  );
}
