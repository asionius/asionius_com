const uuid = require('uuid');
const http = require('http');
const hash = require('hash');
const fs = require('fs');
const db = require('db');
const Pool = require('fib-pool');
const config = require('./config');

let sessionStorage = {};
config.log.forEach((log) => {
    console.add(log);
})
let dbhandle = Pool(() => {
    return db.open('mysql://root:123456');
}, 10)

let svr = new http.Server(8088, [(v) => {
    let ip = v.socket.remoteAddress;
    console.log('remote ip: ' + ip + " address: " + v.address);
    let sessionid = v.cookies['sessionid'];
    if (!sessionid) {
        let sessionid = uuid.random().toString('hex');
        v.response.addHeader('set-Cookie', "sessionid=" + sessionid + "; Expires=" + new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toGMTString() + "; path=/; domain=" + config.domain);
        v.cookies['sessionid'] = sessionid;
        sessionStorage[sessionid] = {
            id: sessionid,
            online: false
        };
    } else if (!sessionStorage[sessionid]) {
        sessionStorage[sessionid] = {
            id: sessionid,
            online: false
        }
    }
    v.session = sessionStorage[sessionid];
}, {
    '/blogdata/sync': function(v) {
        v.response.body.write(JSON.stringify({
            online: v.session.online
        }))
    },
    '/blogdata/signup': (v) => {
        let username = v.form.username;
        let passwd = v.form.passwd;
        let res = dbhandle((conn) => {
            return conn.execute('SELECT username from users where username=?;', username);
        })
        if (res.length > 0) {
            v.response.body.write(JSON.stringify({
                error: 'name exists'
            }))
            return;
        }
        dbhandle((conn) => {
            return conn.execute('INSERT INTO users (username, hpass, `created`) VALUES (?, ?, ?);', username, passwd, new Date());
        })
    },
    '/blogdata/signin': (v) => {
        let username = v.form.username;
        let passwd = v.form.passwd;
        let session = v.session;
        let token = session.token;
        let res = dbhandle((conn) => {
            return conn.execute("SELECT * FROM users where username=?", username);
        })
        if (!res.length) {
            v.response.body.write(JSON.stringify({
                error: 'name not exists'
            }))
            return;
        }
        if (passwd == hash.hmac_md5(token).digest(res[0].hpass).hex()) {
            session.online = true;
            session.username = username;
            v.response.body.write(JSON.stringify({
                result: 0
            }))
        } else {
            v.response.body.write(JSON.stringify({
                error: 'wrong password'
            }))
        }
    },
    '/blogdata/signout': (v) => {
        v.session.online = false;
        v.response.redirect("/");
    },
    '/blogdata/aboutme': (v) => {
        var aboutme = "### introduction\n\n" +
            "- name: 王爱科 Asion\n" +
            "- school: JIT. 金陵科技学院\n" +
            "- hobbies: 旅游、网球、烹饪\n" +
            "- motto: 学如逆水行舟，不进则退\n" +
            "- study experience: 师从中科院软件所于佳耕等多名老师学习linux应用编程、linux内核编程近两年时间，在中国通用芯片基础软件研究中心实习半年。现在互联网公司[那么社区](http://named.cn)工作。\n- 热衷于开源事业, 致力于[fibjs](https://github.com/xicilion/fibjs)的推广. 欢迎广大有志之士前来出谋划策.\n\n\n" +
            "### contact\n\n" +
            "- email: asionius@163.com\n" +
            "- QQ: 814181242";
        v.response.body.write(aboutme);
    },
    '/blogdata/list': (v) => {
        let res = dbhandle((conn) => {
            return conn.execute('SELECT blog.article_id, title, intro, blog.author, catalog, `read`, blog.`created`, count(comment.comment_id) from blog left outer join comment on blog.article_id=comment.article_id group by blog.article_id order by blog.`created` desc;')
        });
        v.response.body.write(JSON.stringify(res));
    },
    '/blogdata/article/(.*)$': (v) => {
        let id = Number(v.value)
        if (!id) {
            console.error('id is null')
            return;
        }
        let res = dbhandle((conn) => {
            return conn.execute('SELECT * from blog where article_id=?;', id);
        });
        if (!res.length) {
            console.error('no article')
            return;
        }
        dbhandle((conn) => {
            conn.execute('UPDATE blog B SET B.read=B.read+1 where article_id=?;', id);
        });
        v.response.body.write(JSON.stringify(res[0]));
    },
    "/blogdata/comment/(.*)$": (v) => {
        let id = Number(v.value)
        if (!id) {
            console.error('id is null')
            return;
        }
        let res = dbhandle((conn) => {
            return conn.execute('SELECT * FROM comment WHERE article_id=?', id);
        });
        v.response.body.write(JSON.stringify(res));
    },
    '/blogdata/catalog/(.*)$': (v) => {
        let catalog = decodeURI(v.value);
        let res = dbhandle((conn) => {
            return conn.execute('SELECT * from blog where catalog=? order by `created` desc;', catalog);
        });
        v.response.body.write(JSON.stringify(res));
    },
    '/blogdata/comment': (v) => {
        let params = v.form;
        if (!("id" in params) || !("name" in params) || !("comment" in params)) {
            res.json({
                error: "name or comment empty"
            });
            return res.end();
        }

        dbhandle((conn) => {
            conn.execute("INSERT INTO comment (article_id, content, quoteid, author, email, created) VALUES (?, ?, ?, ?, ?, ?)", params.id, params.comment, params.quoteid, params.name, params.email);
        });
        if (quoteid > 0) {
            let res = dbhandle((conn) => {
                return conn.execute("SELECT email, LAST_INSERT_ID() comment_id FROM comment WHERE comment_id=?", params.quoteid);
            });
            var email = result[0].email;
            var comment_id = result[0].comment_id;
            var wenan = "您的评论有了新回复点击查看http://asionius.com/article/" + article_id + "#commentid_" + comment_id;
            let mailOptions = {
                from: '"asionius.com" <asionius@163.com>', // sender address
                to: email, // list of receivers
                subject: "您的评论有了新回复点击查看", // Subject line
                text: wenan // plain text body
            };
        }
    },
    '/blogdata/cataloglist': (v) => {
        if (!v.session.online) {
            v.response.body.write(JSON.stringify({
                error: 'need signin'
            }));
            return;
        }
        let res = dbhandle((conn) => {
            return conn.execute("SELECT * FROM catalog");
        });
        v.response.body.write(JSON.stringify(res));
    },
    '/blogdata/blog/launch': (v) => {
        if (!v.session.online) {
            v.response.body.write(JSON.stringify({
                error: 'need signin'
            }));
            return;
        }
        var form = req.form,
            title = form.title,
            content = form.content,
            catalog = form.catalog,
            keywords = JSON.stringify(form.keywords),
            intro = content.substr(0, 200),
            read = 0,
            author = req.session.username,
            created = new Date(),
            changed = created;
        dbhandle((conn) => {
            conn.execute('INSERT INTO blog (title, content, intro, keywords, author, `catalog`, `read`, `created`, `changed`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                title, content, intro, keywords, author, catalog, read, created, changed);
        });
        v.response.body.write(JSON.stringify({
            result: 0
        }));
    },
    '/blogdata/blog/del': (v) => {
        if (!v.session.online) {
            v.response.body.write(JSON.stringify({
                error: 'need signin'
            }));
            return;
        }
        var id = req.form.id;
        if (!/^\d+$/.test("" + id)) {
            v.response.body.write(JSON.stringify({
                error: 'id should be number'
            }));
            return;
        }
        var res = dbhandle((conn) => {
            return conn.execute('SELECT * FROM blog where article_id=?', id);
        });
        if (!res.length) {
            v.response.body.write(JSON.stringify({
                error: 'no such id'
            }));
            return;
        }
        if (res[0].author !== req.session.username) {
            v.response.body.write(JSON.stringify({
                error: 'not permit'
            }));
            return;
        }
        dbhandle((conn) => {
            return conn.execute('DELETE FROM blog where article_id=?', id);
        });
    },
    '*': (v) => [
        http.fileHandler('./public'),
        (v, url) => {
            console.log(url);
            if (/\/(home)|(blog)|(article)|(signin)|(signup)|(about).*/.test(url)) {
                v.response.addHeader('Content-Type', 'text/html');
                v.response.body = fs.openFile('./public/index.html');
                v.response.statusCode = 200;
            }
        }
    ]
}])
svr.run();