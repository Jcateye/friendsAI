export default {
  pages: [
    'pages/login/index',
    'pages/conversation/index',
    'pages/conversation-chat/index',
    'pages/conversation-detail/index',
    'pages/contacts/index',
    'pages/contact-detail/index',
    'pages/contact-create/index',
    'pages/contact-edit/index',
    'pages/action/index',
    'pages/settings/index',
    'pages/connector/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'FriendsAI',
    navigationBarTextStyle: 'black',
    navigationStyle: 'custom',
  },
  tabBar: {
    custom: true,
    color: '#8E8E93',
    selectedColor: '#7C9070',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/conversation/index',
        text: '对话',
      },
      {
        pagePath: 'pages/contacts/index',
        text: '联系人',
      },
      {
        pagePath: 'pages/action/index',
        text: '行动',
      },
    ],
  },
}
