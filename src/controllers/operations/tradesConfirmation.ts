const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export async function sendBrokerEmail({ email, subject, content, attachment }: { email: any; subject: any; content: any; attachment: any }) {
  try {
    let action = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "jm@triadacapital.com", name: "Jean-Marie Barreau" },
      subject: subject,
      htmlContent: "<!DOCTYPE html><html><body><p>Confirmation .</p></body></html>",
      attachment: [
        {
          url: attachment,
        },
      ],
      messageVersions: [
        {
          to: [
            {
              email: email,
            },
          ],
          htmlContent: `<!DOCTYPE html><html><body>

                        <p>${content}</p>
                        <br />For additional support or inquiries, please do not reply to this automated message. Instead, contact us directly at jm@triadacapital.com <br/><br/> </p> Thank you,<br /><br />JM
                        <br/><br/>
                        This message and any attachments are intended for the sole use of its addressee.<br />
                        If you are not the addressee, please immediately notify the sender and then destroy the message.<br />
                        As this message and/or any attachments may have been altered without our knowledge, its content is not legally binding on Triada Capital.<br />
                        All rights reserved.
                        </body></html>`,
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}
