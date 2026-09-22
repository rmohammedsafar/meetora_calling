const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onMessageCreate = onDocumentCreated("messages/{messageId}", async (event) => {
  const messageData = event.data.data();
  if (!messageData) return;

  const { senderId, participants, text, type } = messageData;
  
  // Only send notifications for text messages
  if (type !== 'text' || !text) return;

  // Retrieve sender info to include their name in the notification
  let senderName = "Someone";
  try {
    const senderDoc = await admin.firestore().collection("users").doc(senderId).get();
    if (senderDoc.exists) {
      senderName = senderDoc.data().displayName || "Someone";
    }
  } catch (error) {
    console.error("Error fetching sender details:", error);
  }

  // Find all participants except the sender
  const recipients = (participants || []).filter(id => id !== senderId);

  for (const recipientId of recipients) {
    try {
      const recipientDoc = await admin.firestore().collection("users").doc(recipientId).get();
      if (!recipientDoc.exists) continue;

      const recipientData = recipientDoc.data();
      const tokens = recipientData.fcmTokens || [];

      if (tokens.length === 0) continue;

      const payload = {
        notification: {
          title: `New Message from ${senderName}`,
          body: text,
        },
        data: {
          type: "message",
          senderId: senderId
        }
      };

      // Send multicast message to all devices of the recipient
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification,
        data: payload.data
      });

      // Cleanup stale tokens
      const tokensToRemove = [];
      response.responses.forEach((res, index) => {
        if (!res.success) {
          const error = res.error;
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[index]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await recipientDoc.ref.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
        });
      }
    } catch (error) {
      console.error(`Error sending notification to user ${recipientId}:`, error);
    }
  }
});
