var APP = (function()
{
    var
    hf = (function()
    {
        return{
            elCN: function(cn)
            {
                return document.getElementsByClassName(cn);
            },
            isInside: function(node, target)
            {
                for(; node != null; node = node.parentNode)
                {
                    if (node == target) return true;
                }
            },
            rTarget: function(node, target)
            {
                for(; node != null; node = node.parentNode)
                {
                    if (node.className == target) return node;
                }
            },
            cN: function(e,cl)
            {
                return e.className == cl;
            },
            tN: function(e,tag)
            {
                return e.tagName == tag;
            },
            cEL: function(el, attr)
            {
                var node = document.createElement(el);
                if (attr)
                {
                    for (var a in attr)
                    {
                        if (attr.hasOwnProperty(a))
                        {
                            node.setAttribute(a, attr[a]);
                        }
                    }
                }
                if (arguments[2])
                    node.innerHTML = arguments[2];
                return node;
            },
            ajax: function(type, fd, uri, callback)
            {
                var
                xhr = new XMLHttpRequest();

                xhr.onload = function()
                {
                    callback(this.response);
                }
                xhr.open(type, uri, true);
                if (fd) xhr.send(fd);
                else xhr.send();
            }
        };
    })(),
    contactList = (function()
    {
        var
        contactList,
        buildList = function()
        {
            hf.ajax("GET", null, "templates/contactList.php", function(res)
            {
                var
                container = hf.cEL("div", {class: "module-container contact-list-container"}),
                frag = document.createDocumentFragment(),
                containerExists = hf.elCN("contact-list-container")[0];

                container.innerHTML = res;

                if (!containerExists)
                    document.body.appendChild(container);
                else
                    hf.elCN("contact-list")[0].innerHTML = "";
                
                if (contactList["code"] == 0) return;

                for (var user in contactList)
                {
                    var
                    selBut = hf.cEL("input", {class: "contact-checkbox", type: "checkbox"}),
                    contact = hf.cEL("div", {class: "contact"}),
                    username = hf.cEL("div", {class: "contact-username"}, user);
                    // delBut = hf.cEL("button", {class: "contact-delete-button"}, "Delete");

                    contact.appendChild(selBut);
                    contact.appendChild(username);
                    // contact.appendChild(delBut);

                    frag.appendChild(contact);
                }
                hf.elCN("contact-list")[0].appendChild(frag);
            });
        },
        getList = function()
        {
            hf.ajax("GET", null, "phpSrc/listContacts.php", function(res)
            {
                contactList = JSON.parse(res);
                // console.log(contactList);
                buildList();
            });
        },
        addContact = function(u)
        {
            // console.log("yay");
            var
            fd = new FormData();

            fd.append("contact", u);

            hf.ajax("POST", fd, "phpSrc/addContact.php", function(res)
            {
                console.log(res);
                hf.ajax("GET", null, "phpSrc/listContacts.php", function(r)
                {
                    contactList = JSON.parse(r);
                    if (contactList["code"] == null)
                    {
                        // console.log(contactList);
                        buildList();
                    }
                });
            });
        },
        deleteContact = function(i, u)
        {
            var
            fd = new FormData();

            fd.append("username", u);

            hf.ajax("POST", fd, "phpSrc/deleteContact.php", function(res)
            {
                // console.log(res);
                // res = JSON.parse(res);
                if (res["code"] == null)
                {
                    delete contactList[u];
                    buildList();
                }
                else
                {
                    // console.log(res);
                }
            });
        },
        deleteMultipleContacts = function()
        {
            console.log(contactList);
            var
            newContactList = {},
            fd = new FormData(),
            backupContactList = contactList,
            checkboxes = hf.elCN("contact-checkbox"),
            delBut = hf.elCN("delete-multiple-contact-button")[0],
            contactListContainer = hf.elCN("contact-list")[0];

            checkBoxIndexes = [];
            for (var i = 0, len = checkboxes.length; i < len; i++)
            {
                if (!checkboxes[i].checked)
                {
                    var
                    user = checkboxes[i].parentNode.children[1].innerText;
                    newContactList[user] = contactList[user];
                }
            }
            contactList = newContactList;
            fd.append("contacts", JSON.stringify(contactList));
            hf.ajax("POST", fd, "phpSrc/deleteMultipleContacts.php", function(res)
            {
                console.log(res);
                res = JSON.parse(res);

                if (res["code"] == 0)
                {
                    contactList = backupContactList;
                }
                delBut.style.display = "none";
                buildList();
            });
        },
        checkboxClick = function(e)
        {
            var
            checkboxes = hf.elCN("contact-checkbox"),
            delBut = hf.elCN("delete-multiple-contact-button")[0];
            console.log(delBut);

            //if any are selected view delete button
            for (var i = 0, len = checkboxes.length; i < len; i++)
            {
                if (checkboxes[i].checked)
                {
                    delBut.style.display = "block";
                    return;
                }
            }
            delBut.style.display = "none";
        }
        return {
            init: function()
            {
                getList();
            },
            click: function(ev)
            {
                var
                e = ev.target,
                contactListContainer = hf.elCN("contact-list-container")[0];

                if (hf.isInside(e, contactListContainer))
                {
                    if (hf.cN(e, "contact-username"))
                    {
                        var user = ev.target.innerText;

                        messageDraft.init(user);
                    }
                    else if (hf.cN(e, "add-contact-button"))
                    {
                        var
                        user = hf.elCN("add-contact-input")[0].value;
                        addContact(user)
                    }
                    else if (hf.cN(e, "contact-checkbox"))
                    {
                        checkboxClick(e);
                    }
                    else if (hf.cN(e, "delete-multiple-contact-button"))
                    {
                        deleteMultipleContacts();
                    }
                }
            }
        };
    })(),
    messageDraft = (function()
    {
        var
        imgs = [],
        fls = [],
        fileList = [],
        imgList = [],
        sendPlaintext = function(rec, pt, el)
        {
            console.log(fls);
            if (imgs.length > 0)
            {
                pt += "<div class=image-file-list>";
                pt += JSON.stringify(imgList);
                pt += "</div>";

                pt += "<div class=view-message-images-container>";
                for (var i = 0, len = imgs.length; i < len; i++)
                {
                    pt += imgs[i];
                }
                pt += "</div>";
            }
            if (fls.length > 0)
            {
                pt += "<div class=file-file-list>";
                pt += JSON.stringify(fileList);
                pt += "</div>";

                pt += "<div class=view-message-files-container>";
                for (var i = 0, len = fls.length; i < len; i++)
                {
                    pt += fls[i];
                }
                pt += "</div>";
            }
            console.log(pt);
            if (pt === "") return;
            var
            fd = new FormData();


            fd.append("plaintext", pt);
            fd.append("recipient", rec);

            hf.ajax("POST", fd, "phpSrc/sendMessage.php", function(res)
            {
                // console.log("Response recieved for sent message");
                document.body.removeChild(el);
                imgs = [];
                contactList.init();
            });
        },
        addFiles = function()
        {
            var
            fileInput = hf.elCN("file-upload-input")[0];
            fileInput.click();

            fileInput.onchange = function()
            {
                var
                files = fileInput.files;

                for (var i = 0, len = files.length; i < len; i++)
                {
                    if (files[i].type.match("image.*"))
                    {
                        imgList.push(files[i]);

                        var
                        img = new Image(),
                        reader = new FileReader();
                        img.file = files[i];

                        reader.onload = (function(aImg) 
                        { 
                            return function(e) 
                            { 
                                aImg.src = e.target.result; 

                                var
                                i = "<div class=img-container><div class=img style=background-image:url(";
                                i += e.target.result;
                                i += ");><div><p>Download</p></div></div></div>";

                                imgs.push(i);
                            }; 
                        })(img);
                        reader.readAsDataURL(files[i]);
                    }
                    else
                    {
                        fileList.push(files[i]);

                        var
                        reader = new FileReader();

                        reader.onload = (function(file)
                        {
                            return function(res)
                            {
                                var
                                f = "<div class=fl-container><a target=_blank href=";
                                f += res.target.result;
                                f += "><p>";
                                f += file.name + "<br>";
                                f += (file.size / 1000000).toFixed(2) + "MB";
                                f += "</p></a></div>";

                                fls.push(f);
                            }
                        })(files[i]);
                        reader.readAsDataURL(files[i]);
                    }
                }
            }
        },
        closeMessage = function(e)
        {
            for (var i = 0, len = imgs.length; i < len; i++)
            {
                imgs[i] = "0".repeat(imgs[i].length);
            }
            imgs = [];
            document.body.removeChild(e);
        }
        return{
            init: function(rec)
            {
                hf.ajax("GET", null, "templates/sendMessage.php", function(res)
                {
                    var
                    container = document.createElement("div");
                    container.className = "module-container send-message-box";
                    container.innerHTML = "";

                    var elemExists = hf.elCN("send-message-box")[0]
                    if (!elemExists)
                        document.body.appendChild(container);
                    container.innerHTML = res;

                    hf.elCN("send-message-button").disabled = false;
                    if (rec)
                        hf.elCN("send-message-box")[0].children[0].value = rec;
                });
            },
            click: function(ev)
            {
                var
                e = ev.target,
                sendMessageBox = hf.elCN("send-message-box")[0];

                if (hf.isInside(e, sendMessageBox))
                {
                    var
                    rec = sendMessageBox.getElementsByTagName("input")[0],
                    ta = sendMessageBox.getElementsByTagName("textarea")[0],
                    file = sendMessageBox.getElementsByTagName("button")[0],
                    sub = sendMessageBox.getElementsByTagName("button")[1],
                    dis = sendMessageBox.getElementsByTagName("button")[2];
                    if (e == ta)
                    {

                    }
                    else if (e == file)
                    {
                        addFiles();
                    }
                    else if (e == sub)
                    {
                        sendPlaintext(rec.value, ta.value,e.parentNode);
                        e.disabled = true;
                    }
                    else if (e == dis)
                    {
                        closeMessage(e.parentNode);
                    }
                }
            }
        };
    })(),
    messageView = (function()
    {
        var
        currentMessage,
        flFileList,
        imgFileList;
        buildView = function()
        {
            hf.ajax("GET", null, "templates/viewMessage.php", function(res)
            {
                var
                container = hf.cEL("div", {class: "module-container view-message-container"}),
                frag = document.createDocumentFragment(),
                date = new Date(currentMessage["timestamp"] * 1000),
                containerExists = hf.elCN("view-message-container")[0];

                container.innerHTML = res;

                if (!containerExists)
                {
                    document.body.appendChild(container);
                }
                else
                {
                    sender.innerHTML = "";
                    timestamp.innerHTML = "";
                    message.innerHTML = "";
                }
                
                if (contactList["code"] == 0) return;

                var
                sender = hf.elCN("view-message-sender")[0],
                timestamp = hf.elCN("view-message-timestamp")[0],
                message = hf.elCN("view-message-message")[0];

                sender.innerHTML = currentMessage["sender"];
                timestamp.innerHTML = date.toLocaleString();
                message.innerHTML = currentMessage["plaintext"];

                var
                imgFileListContainer = hf.elCN("image-file-list")[0],
                flFileListContainer = hf.elCN("file-file-list")[0];
                if (imgFileListContainer)
                    imgFileList = JSON.parse(imgFileListContainer.innerText);
                if (flFileListContainer)
                    flFileList = JSON.parse(flFileListContainer.innerText);
            });
        },
        deleteMessage = function(e)
        {
            messageList.deleteMessage(currentMessage["sender"], currentMessage["timestamp"]);
        },
        closeMessage = function(e)
        {
            document.body.removeChild(e.parentNode.parentNode);
            
            //Clear the plaintext from memory, A little heavy handed
            currentMessage["plaintext"] = "0".repeat(currentMessage["plaintext"].length);
            currentMessage = {};
        },
        imageClick = function(img)
        {
            var
            anchor = hf.cEL("a", {target: "_blank"}),
            style = window.getComputedStyle(img.children[0]).backgroundImage,
            uri = style.slice(4, style.length-1);
            container = hf.elCN("view-message-images-container")[0],
            index = Array.prototype.indexOf.call(container.children, img);

            anchor.download = imgFileList[index].name;
            anchor.href = uri;
            anchor.click();
        },
        fileClick = function(img)
        {
            console.log(flFileList);
            var
            fileContainer = hf.elCN("view-message-files-container")[0],
            index = Array.prototype.indexOf.call(fileContainer.children, img.parentNode);

            img.download = flFileList[index].name;
            img.click();
        }
        return{
            init: function(res)
            {
                currentMessage = res;
                buildView();
            },
            click: function(ev)
            {
                var
                e = ev.target,
                viewMessageContainer = hf.elCN("view-message-container")[0],
                fileContainer = hf.elCN("view-message-files-container")[0],
                imgContainer = hf.elCN("view-message-images-container")[0];

                if (hf.isInside(e, viewMessageContainer))
                {
                    if (hf.cN(e, "view-message-reply-button"))
                    {
                        messageDraft.init(currentMessage["sender"]);
                    }
                    else if (hf.cN(e, "view-message-delete-button"))
                    {
                        deleteMessage(e);
                        closeMessage(e);
                    }
                    else if (hf.cN(e, "view-message-close-button"))
                    {
                        closeMessage(e);
                    }
                    else if (hf.isInside(e, imgContainer))
                    {
                        ev.preventDefault();
                        var img;
                        if (img = hf.rTarget(e, "img-container"))
                        {
                            imageClick(img);
                        }
                    }
                    else if (hf.isInside(e, fileContainer))
                    {
                        ev.preventDefault();
                        var img;
                        if (img = hf.rTarget(e, "fl-container"))
                        {
                            fileClick(img.children[0]);
                        }
                    }
                }
            }
        }
    })(),
    messageList = (function()
    {
        var
        messageList,
        buildList = function()
        {
            hf.ajax("GET", null, "templates/messageList.php", function(res)
            {
                var
                container = hf.cEL("div", {class: "module-container message-list-container"}),
                frag = document.createDocumentFragment(),
                containerExists = hf.elCN("message-list-container")[0];

                container.innerHTML = res;

                if (!containerExists)
                    document.body.appendChild(container);
                else
                    hf.elCN("message-list")[0].innerHTML = "";
                
                if (messageList["code"] == 0) return;

                for (var user in messageList)
                {
                    for (var message in messageList[user])
                    {
                        var
                        msg = hf.cEL("div", {class: "message"}),
                        selBut = hf.cEL("input", {class: "message-checkbox", type: "checkbox"}),
                        username = hf.cEL("div", {class: "message-username"}, user),
                        date = new Date(messageList[user][message].timestamp * 1000),
                        timestamp = hf.cEL("div", {class: "message-timestamp"}, date.toLocaleString());
                        // delBut = hf.cEL("button", {class: "message-delete-button"}, "Delete");

                        msg.appendChild(selBut);
                        msg.appendChild(username);
                        msg.appendChild(timestamp);
                        // msg.appendChild(delBut);

                        frag.appendChild(msg);
                    }
                }
                hf.elCN("message-list")[0].appendChild(frag);
            });
        },
        viewMessage = function(u,t)
        {
            var
            fd = new FormData();

            fd.append("username", u);
            fd.append("timestamp", t);

            hf.ajax("POST", fd, "phpSrc/viewMessage.php", function(res)
            {
                res = JSON.parse(res);

                messageView.init(res);                
            });
        },
        checkboxClick = function(e)
        {
            var
            checkboxes = hf.elCN("message-checkbox"),
            delBut = hf.elCN("delete-multiple-messages-button")[0];

            //if any are selected view delete button
            for (var i = 0, len = checkboxes.length; i < len; i++)
            {
                if (checkboxes[i].checked)
                {
                    delBut.style.display = "block";
                    return;
                }
            }
            delBut.style.display = "none";
        }
        delMessage = function(u, t)
        {
            var
            fd = new FormData();

            fd.append("timestamp", t);
            fd.append("username", u);

            hf.ajax("POST", fd, "phpSrc/deleteMessage.php", function(res)
            {
                // console.log(res);
                // res = JSON.parse(res);
                if (res["code"] == null)
                {
                    delete messageList[u][t];
                    buildList();
                }
                else
                {
                    // console.log(res);
                }
            });
        },
        deleteMultipleMessages = function()
        {
            var
            newMessageList = messageList,
            fd = new FormData(),
            backupMessageList = messageList,
            checkboxes = hf.elCN("message-checkbox"),
            delBut = hf.elCN("delete-multiple-messages-button")[0],
            messageListContainer = hf.elCN("message-list")[0];

            checkBoxIndexes = [];
            for (var i = 0, len = checkboxes.length; i < len; i++)
            {
                if (checkboxes[i].checked)
                {
                    var
                    user = checkboxes[i].parentNode.children[1].innerText,
                    timestamp = new Date(checkboxes[i].parentNode.children[2].innerText).getTime() / 1000;
                    
                    delete newMessageList[user][timestamp];

                }
            }
            for (var user in newMessageList)
            {
                if (newMessageList[user].length == 0)
                {
                    delete newMessageList[user];
                }
            }

            messageList = newMessageList;
            console.log(messageList);
            fd.append("messages", JSON.stringify(messageList));
            hf.ajax("POST", fd, "phpSrc/deleteMultipleMessages.php", function(res)
            {
                console.log(res);
                res = JSON.parse(res);

                if (res["code"] == 0)
                {
                    messageList = backupMessageList;
                }
                delBut.style.display = "none";
                buildList();
            });
        },
        getList = function()
        {
            hf.ajax("GET", null, "phpSrc/listMessages.php", function(res)
            {
                messageList = JSON.parse(res);
                // console.log(messageList);
                buildList();
            });
        };

        return{
            init: function()
            {
                getList();
            },
            deleteMessage: function(user,time)
            {
                delMessage(user,time);
            },
            click: function(ev)
            {
                var
                e = ev.target,
                messageListContainer = hf.elCN("message-list-container")[0];

                if (hf.isInside(e, messageListContainer))
                {
                    if (hf.cN(e, "message-username") || hf.cN(e, "message-timestamp"))
                    {
                        var
                        user = e.parentNode.children[1].innerText,
                        time = new Date(e.parentNode.children[2].innerText).getTime() / 1000;

                        viewMessage(user, time);
                    }
                    else if (hf.cN(e, "refresh-messages-button"))
                    {
                        getList();
                    }
                    else if (hf.cN(e, "create-message-button"))
                    {
                        messageDraft.init();
                    }
                    else if (hf.cN(e, "message-checkbox"))
                    {
                        checkboxClick();
                    }
                    else if (hf.cN(e, "delete-multiple-messages-button"))
                    {
                        deleteMultipleMessages();
                    }
                }
            }
        }
    })(),
    login = (function()
    {
        var
        submitCreds = function(un, pw)
        {
            if (un === "") return;
            if (pw === "") return;

            //send creds to phpSrc/login.php
            var
            fd = new FormData();

            fd.append("username", un);
            fd.append("password", pw);

            hf.ajax("POST", fd, "phpSrc/login.php", function(res)
            {
                if (res)
                {
                    var
                    r = JSON.parse(res);
                    if (r.code)
                    {
                        //Logged in!
                        // console.log(r.message);
                        hf.elCN("loginerror")[0].innerText = r.message;

                        document.body.innerHTML = "";
                        // sendMessage.init();
                        messageList.init();
                        contactList.init();

                    }
                    else
                    {
                        //Something failed
                        // console.log(r.message);
                        hf.elCN("loginerror")[0].innerText = r.message;
                    }
                }
            })
            


        }
        return{
            click: function(ev)
            {
                var
                e = ev.target,
                loginBox = hf.elCN("login-box")[0];

                if (hf.isInside(e, loginBox))
                {
                    var
                    un = loginBox.getElementsByTagName("input")[0],
                    pw = loginBox.getElementsByTagName("input")[1],
                    sub = loginBox.getElementsByTagName("button")[0];
                    if (e == un)
                    {

                    }
                    else if (e == pw)
                    {

                    }
                    else if (e == sub)
                    {
                        submitCreds(un.value, pw.value);
                    }
                }
            }
        };
    })();
    return {
        clicked: function(ev)
        {
            login.click(ev);
            messageDraft.click(ev);
            messageList.click(ev);
            contactList.click(ev);
            messageView.click(ev);
        }
    };
})();

window.onclick = function(ev)
{
    APP.clicked(ev);
}