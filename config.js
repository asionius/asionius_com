module.exports = {
    db: {
        "connString": "mysql://root:123456@localhost/aionius_com"
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