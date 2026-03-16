// ========================================
// Firebase 設定・初期化・認証・ユーザー管理
// ========================================

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDf8Yn-r5W1i6YptJ9DXch7i14JRi9bAf0",
    authDomain: "test-futari-no-ranking.firebaseapp.com",
    databaseURL: "https://test-futari-no-ranking-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "test-futari-no-ranking",
    storageBucket: "test-futari-no-ranking.firebasestorage.app",
    messagingSenderId: "802679547612",
    appId: "1:802679547612:web:1582d3e0176282ede43619"
};

let firebaseApp = null;
let database = null;

function initializeFirebase() {
    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        database = firebase.database();
        console.log('✅ Firebase接続成功');
        return true;
    } catch (error) {
        console.error('❌ Firebase接続エラー:', error);
        return false;
    }
}

// Firebase匿名認証 → ユーザー情報保存 → テーマ読み込み
async function initializeUserInFirebase() {
    if (!database || !App.userProfile) return;

    const userId = App.userProfile.userId;
    const userRef = database.ref('users/' + userId);

    try {
        const snapshot = await userRef.once('value');
        if (snapshot.exists()) {
            App.currentUser = snapshot.val();
            await userRef.update({
                displayName: App.userProfile.displayName,
                firebaseUid: firebase.auth().currentUser.uid,
                lastLoginAt: new Date().toISOString()
            });
        } else {
            const newUser = {
                userId: userId,
                displayName: App.userProfile.displayName,
                firebaseUid: firebase.auth().currentUser.uid,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };
            await userRef.set(newUser);
            App.currentUser = newUser;
        }
        console.log('✅ ユーザー情報を保存しました');
    } catch (error) {
        console.error('❌ ユーザー情報保存エラー:', error);
    }
}

// Analytics: イベント記録
function trackEvent(eventName, eventData = {}) {
    if (!database || !App.currentUser) return;
    try {
        database.ref('analytics/events').push({
            event: eventName,
            userId: App.currentUser.userId,
            displayName: App.userProfile?.displayName || 'unknown',
            data: eventData,
            timestamp: Date.now(),
            date: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics記録エラー:', error);
    }
}
