const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// 1. Text Message Notifications
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

// 2. Incoming Call Push Notifications
exports.onCallCreate = onDocumentCreated("calls/{callId}", async (event) => {
  const callData = event.data.data();
  if (!callData) return;

  const { callerName, calleeId, type, status, callerId } = callData;
  if (status !== 'ringing') return;

  try {
    const recipientDoc = await admin.firestore().collection("users").doc(calleeId).get();
    if (!recipientDoc.exists) return;

    const recipientData = recipientDoc.data();
    const tokens = recipientData.fcmTokens || [];
    if (tokens.length === 0) return;

    const callTypeStr = type === 'video' ? 'Video' : 'Audio';

    const payload = {
      notification: {
        title: `Incoming ${callTypeStr} Call`,
        body: `${callerName || 'Someone'} is calling you on Meetora...`,
      },
      data: {
        type: "incoming_call",
        callId: event.params.callId,
        callerId: callerId || '',
        callerName: callerName || 'Someone',
        callType: type || 'audio'
      },
      webpush: {
        headers: {
          Urgency: "high"
        },
        notification: {
          requireInteraction: true,
          tag: `call-${event.params.callId}`,
          renotify: true
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: payload.notification,
      data: payload.data,
      webpush: payload.webpush
    });

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
    console.error(`Error sending call notification to user ${calleeId}:`, error);
  }
});

// 3. Call Cancellation / End Push Notification
exports.onCallUpdate = onDocumentUpdated("calls/{callId}", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  if (!beforeData || !afterData) return;

  // If the call was ringing and then cancelled/ended/declined
  if (beforeData.status === 'ringing' && (afterData.status === 'ended' || afterData.status === 'cancelled' || afterData.status === 'declined')) {
    const { calleeId } = afterData;
    try {
      const recipientDoc = await admin.firestore().collection("users").doc(calleeId).get();
      if (!recipientDoc.exists) return;

      const tokens = recipientDoc.data().fcmTokens || [];
      if (tokens.length === 0) return;

      await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        data: {
          type: "call_cancelled",
          callId: event.params.callId
        }
      });
    } catch (e) {
      console.warn("Failed to send call cancellation notification:", e);
    }
  }
});

// 4. Auto-create or update Firestore user document whenever an Auth user is created
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = admin.firestore().collection("users").doc(user.uid);
    const userDoc = await userRef.get();

    const email = user.email || "";
    const fallbackName = email ? email.split("@")[0] : "User";
    const displayName = (userDoc.exists && userDoc.data().displayName && userDoc.data().displayName !== "Anonymous")
      ? userDoc.data().displayName
      : (user.displayName || fallbackName);

    await userRef.set({
      uid: user.uid,
      email: email,
      displayName: displayName,
      photoURL: user.photoURL || null,
      status: (userDoc.exists && userDoc.data().status) ? userDoc.data().status : "offline",
      lastSeen: (userDoc.exists && userDoc.data().lastSeen) ? userDoc.data().lastSeen : admin.firestore.FieldValue.serverTimestamp(),
      createdAt: user.metadata.creationTime || new Date().toISOString()
    }, { merge: true });

    console.log(`[onUserCreated] Successfully saved user profile for ${user.uid} (${email})`);
  } catch (error) {
    console.error(`[onUserCreated] Error saving user ${user.uid}:`, error);
  }
});

// 5. HTTP endpoint to sync existing Firebase Auth users to Firestore
exports.syncUsers = onRequest({ cors: true }, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const batch = admin.firestore().batch();
    let count = 0;

    for (const userRecord of listUsersResult.users) {
      const userRef = admin.firestore().collection("users").doc(userRecord.uid);
      const userDoc = await userRef.get();

      const email = userRecord.email || "";
      const fallbackName = email ? email.split("@")[0] : "User";
      const displayName = (userDoc.exists && userDoc.data().displayName && userDoc.data().displayName !== "Anonymous")
        ? userDoc.data().displayName
        : (userRecord.displayName || fallbackName);

      batch.set(userRef, {
        uid: userRecord.uid,
        email: email,
        displayName: displayName,
        photoURL: userRecord.photoURL || null,
        status: (userDoc.exists && userDoc.data().status) ? userDoc.data().status : "offline",
        lastSeen: (userDoc.exists && userDoc.data().lastSeen) ? userDoc.data().lastSeen : admin.firestore.FieldValue.serverTimestamp(),
        createdAt: (userDoc.exists && userDoc.data().createdAt) ? userDoc.data().createdAt : (userRecord.metadata.creationTime || new Date().toISOString())
      }, { merge: true });
      count++;
    }

    await batch.commit();
    res.json({ success: true, count, message: `Successfully synchronized ${count} users.` });
  } catch (error) {
    console.error("Error syncing users:", error);
    res.status(500).json({ error: error.message });
  }
});
