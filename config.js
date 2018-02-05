module.exports = {
    domain: "127.0.0.1",
    listenPort: 8081,
    // domain: "asionius.com",
    db: {
        "connString": "mysql://root:123456@localhost/asionius_com"
    },
    log: [{
        "type": "file",
        "levels": [4, 5, 6],
        "path": "/var/log/asionius_com_access.log",
        "split": "day",
        "count": 10
    }, {
        "type": "console"
    }]
}