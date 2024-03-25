const os = require('os');

module.exports =
  ({ user, host, date }) =>
  ({ msg = '', event = 'Успешно' }) =>
    console.siem(
      JSON.stringify({
        id: null,
        VENDOR: 'Glowbyte',
        DeviceEventClassID: null,
        NAME: null,
        Severity: null,
        StartTime: date,
        EndTime: new Date(),
        Count: null,
        SourceUserFullName: user ? user.username : 'System',
        SourceUserID: user ? user.id : 'System',
        SourceUserName: user ? user.username : 'System',
        SourceHostName: host,
        DeviceHostName: os.hostname(),
        EventOutcome: event,
        Product: 'СУМ',
        Version: '0.0.0',
        ProductModul: 'СУМ. API.',
        ProductPage: null,
        DestinationUserFullName: null,
        DestinationUserID: null,
        DestinationUserName: null,
        DestinationUserPrivileges: null,
        Message: msg,
        Category: null,
      })
    );
