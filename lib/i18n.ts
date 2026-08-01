// Simple i18n system for language switching
// Supports: English (en), Traditional Chinese (zh-TW)

export type Language = 'en' | 'zh-TW';

export const LANGUAGES: Record<Language, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
};

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'nav.classes': 'Classes',
    'nav.team': 'Team',
    'nav.activity': 'Activity',
    'nav.studentView': 'Student view',
    'nav.signedInAs': 'Signed in as',
    'nav.signOut': 'Sign out',
    'nav.allClasses': 'All classes',

    // Student dashboard
    'dashboard.title': 'Class Applications',
    'dashboard.subtitle': 'Browse the classes below and apply with your name and WhatsApp number.',
    'dashboard.open': 'OPEN FOR APPLICATIONS',
    'dashboard.notOpen': 'NOT CURRENTLY OPEN',
    'dashboard.browseOtherClasses': 'Browse other classes',

    // Class detail
    'class.instructor': 'Instructor',
    'class.when': 'When',
    'class.where': 'Where',
    'class.seatsLeft': 'left',
    'class.seatsTaken': 'seats taken',
    'class.noSeatsLeft': 'No seats left',
    'class.applicationsClosed': 'Applications for this class are closed.',
    'class.isFull': 'This class is full.',
    'class.joinWaitlist': 'Join the waitlist',
    'class.applyForThisClass': 'Apply for this class',

    // Apply form
    'form.fullName': 'Full name',
    'form.whatsappNumber': 'WhatsApp number',
    'form.apply': 'Apply',
    'form.keepMyPlace': 'Keep my place',
    'form.yesWithdrawMe': 'Yes, withdraw me',

    // Success messages
    'success.confirmed': "You're on the list",
    'success.seatReserved': 'your seat in',
    'success.isReserved': 'is reserved.',
    'success.willReachYou': "We'll reach you on WhatsApp at",
    'success.waitlisted': 'You\'re on the waitlist',
    'success.waitlistPosition': 'you\'re number',
    'success.inTheQueue': 'in the queue for',
    'success.willMessageIfSeatFrees': 'We\'ll message you on WhatsApp if a seat frees up.',
    'success.cantMakeLater': "Can't make it later on?",
    'success.keepThisLink': 'Keep this link — it lets you release your place without messaging anyone.',

    // Withdrawal
    'withdraw.title': 'Withdraw your application',
    'withdraw.holdSeat': 'you currently hold a seat for',
    'withdraw.holdQueue': 'you currently hold a place in the queue for',
    'withdraw.withdrawingFreesForOthers': 'Withdrawing frees it for someone else and cannot be undone — you would need to apply again.',
    'withdraw.alreadyWithdrawn': 'Already withdrawn',
    'withdraw.youreNoLongerSignedUp': "you're no longer signed up for",

    // Admin
    'admin.createClass': '+ New class',
    'admin.classCreated': 'Class created.',
    'admin.changesSaved': 'Changes saved.',
    'admin.promoted': 'Promoted from the waitlist into a seat.',
    'admin.restored': 'Applicant restored.',
    'admin.classDeleted': 'Class deleted.',
    'admin.applicantDeleted': 'Applicant deleted.',
    'admin.administratorAdded': 'Administrator added.',
    'admin.administratorRemoved': 'Administrator removed.',
    'admin.passwordChanged': 'Password changed.',

    // Buttons
    'btn.download': 'Download CSV',
    'btn.cancel': 'Cancel',
    'btn.restore': 'Restore',
    'btn.delete': 'Delete',
    'btn.promote': 'Promote',
    'btn.deleteClass': 'Delete class',
    'btn.addAdministrator': 'Add administrator',
    'btn.changePassword': 'Change password',
    'btn.addAdmin': 'Add admin',
    'btn.remove': 'Remove',
    'btn.tryAgain': 'Try again',
    'btn.backToClasses': 'Back to classes',
    'btn.openClass': 'Open',
    'btn.closeClass': 'Close',

    // Errors
    'error.invalid': "That WhatsApp number doesn't look right for the country you picked. Check the digits.",
    'error.classDoesntExist': "Class doesn't exist",
    'error.classClosed': 'Class is closed',
    'error.classIsFull': 'Class is full',
    'error.alreadyApplied': "You've already applied to this class",
    'error.sometingWentWrong': 'Something went wrong',
    'error.tryAgain': 'Try again in a moment.',

    // Login
    'login.title': 'Administrator Sign In',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.signIn': 'Sign in',
    'login.failed': 'Login failed',
    'login.tooManyAttempts': 'Too many login attempts. Please try again later.',

    // Settings
    'settings.language': 'Language',
  },

  'zh-TW': {
    // Common
    'nav.classes': '課程',
    'nav.team': '團隊',
    'nav.activity': '活動紀錄',
    'nav.studentView': '學生視圖',
    'nav.signedInAs': '登入身份：',
    'nav.signOut': '登出',
    'nav.allClasses': '所有課程',

    // Student dashboard
    'dashboard.title': '課程申請',
    'dashboard.subtitle': '瀏覽下面的課程，用你的名字和 WhatsApp 號碼申請。',
    'dashboard.open': '接受申請',
    'dashboard.notOpen': '暫不接受申請',
    'dashboard.browseOtherClasses': '瀏覽其他課程',

    // Class detail
    'class.instructor': '講師',
    'class.when': '時間',
    'class.where': '地點',
    'class.seatsLeft': '個名額',
    'class.seatsTaken': '人已報名',
    'class.noSeatsLeft': '沒有空位',
    'class.applicationsClosed': '此課程不再接受申請。',
    'class.isFull': '此課程已滿。',
    'class.joinWaitlist': '加入候補名單',
    'class.applyForThisClass': '申請此課程',

    // Apply form
    'form.fullName': '全名',
    'form.whatsappNumber': 'WhatsApp 號碼',
    'form.apply': '申請',
    'form.keepMyPlace': '保留我的位置',
    'form.yesWithdrawMe': '是的，我要退出',

    // Success messages
    'success.confirmed': '你已確認報名',
    'success.seatReserved': '你在',
    'success.isReserved': '已確保位置。',
    'success.willReachYou': '我們會透過 WhatsApp 聯繫你：',
    'success.waitlisted': '你已加入候補名單',
    'success.waitlistPosition': '你是第',
    'success.inTheQueue': '位候補者，申請',
    'success.willMessageIfSeatFrees': '如果有空位，我們會透過 WhatsApp 聯繫你。',
    'success.cantMakeLater': '稍後無法參加？',
    'success.keepThisLink': '保存此連結 — 你可以隨時使用它退出申請，無需傳訊。',

    // Withdrawal
    'withdraw.title': '取消課程申請',
    'withdraw.holdSeat': '你目前已確認報名',
    'withdraw.holdQueue': '你目前在候補名單中排隊申請',
    'withdraw.withdrawingFreesForOthers': '取消申請會釋放給其他人，無法撤銷 — 你之後需要重新申請。',
    'withdraw.alreadyWithdrawn': '已取消',
    'withdraw.youreNoLongerSignedUp': '你已不再報名',

    // Admin
    'admin.createClass': '+ 新課程',
    'admin.classCreated': '課程已建立。',
    'admin.changesSaved': '變更已儲存。',
    'admin.promoted': '已從候補名單提升到確認位置。',
    'admin.restored': '申請者已恢復。',
    'admin.classDeleted': '課程已刪除。',
    'admin.applicantDeleted': '申請者已刪除。',
    'admin.administratorAdded': '管理員已新增。',
    'admin.administratorRemoved': '管理員已移除。',
    'admin.passwordChanged': '密碼已變更。',

    // Buttons
    'btn.download': '下載 CSV',
    'btn.cancel': '取消',
    'btn.restore': '恢復',
    'btn.delete': '刪除',
    'btn.promote': '提升',
    'btn.deleteClass': '刪除課程',
    'btn.addAdministrator': '新增管理員',
    'btn.changePassword': '變更密碼',
    'btn.addAdmin': '新增管理員',
    'btn.remove': '移除',
    'btn.tryAgain': '重試',
    'btn.backToClasses': '返回課程',
    'btn.openClass': '開放',
    'btn.closeClass': '關閉',

    // Errors
    'error.invalid': '該 WhatsApp 號碼對你選擇的國家/地區不太正確。請檢查數字。',
    'error.classDoesntExist': '課程不存在',
    'error.classClosed': '課程已關閉',
    'error.classIsFull': '課程已滿',
    'error.alreadyApplied': '你已申請過此課程',
    'error.sometingWentWrong': '發生問題',
    'error.tryAgain': '請稍後重試。',

    // Login
    'login.title': '管理員登入',
    'login.username': '使用者名稱',
    'login.password': '密碼',
    'login.signIn': '登入',
    'login.failed': '登入失敗',
    'login.tooManyAttempts': '登入嘗試次數過多。請稍後重試。',

    // Settings
    'settings.language': '語言',
  },
};

export function getTranslation(language: Language, key: string): string {
  return translations[language]?.[key] ?? translations['en']?.[key] ?? key;
}

export function getLanguageFromStorage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('language');
  return stored === 'zh-TW' ? 'zh-TW' : 'en';
}

export function setLanguageInStorage(language: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', language);
  }
}
