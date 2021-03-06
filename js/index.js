var APP = (function()
{
    var
    appState = "login",
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
            },
            convertSize: function(size)
            {
                var s = size;
                s /= 1000;
                if (s > 1000)
                {
                    s /= 1000;
                    s = Math.ceil(s) + " MB";
                }
                else
                {
                    s = Math.ceil(s) + " KB";
                }
                return s;
            },
            convertTime: function(time)
            {
                var
                now = new Date(),
                midnight = new Date(),
                date = String.prototype.split.call(time, " ");
                timestamp = time.getTime() / 1000;

                midnight = midnight.setHours(0,0,0,0) / 1000;
                now = now.getTime() / 1000;

                var min = time.getMinutes();


                if (timestamp > midnight)
                    return (time.getHours() % 12) + ":" + (min < 10 ? '0' : '') + min + " " + String.prototype.slice.call(time.toLocaleTimeString(), time.toLocaleTimeString().length-2);
                else
                    return date[1] + " " + date[2];
            }
        };
    })(),
    viewContact = (function()
    {
        var
        buildContact = function(u)
        {
            hf.ajax("GET", null, "templates/viewContact.php", function(res)
            {
                var
                container = hf.cEL("div", {class: "module-container contact-view-container"}),
                containerExists = hf.elCN("contact-view-container")[0];

                container.innerHTML = res;

                if (!containerExists)
                {
                    document.body.appendChild(container);
                }
                else
                {
                    hf.elCN("avatar")[0].removeAttribute("style");
                    hf.elCN("contact-username")[0].innerHTML = "";                    
                    hf.elCN("contact-displayname")[0].innerHTML = "";                    
                    hf.elCN("contact-lastlogin")[0].innerHTML = "";                    
                    hf.elCN("contact-public")[0].innerHTML = "";                    
                }
                    
                if (u.code == 0 || u.code == -1) return;

                var date = new Date(u.lastLogin*1000);

                hf.elCN("avatar")[0].style.backgroundImage = "url(" + u.avatar + ")";
                hf.elCN("contact-username")[0].innerHTML = u.username;                    
                hf.elCN("contact-displayname")[0].innerHTML = u.displayName;                    
                hf.elCN("contact-lastlogin")[0].innerHTML = "Last Login: " + date.toLocaleString();                    
                hf.elCN("contact-public")[0].innerHTML = u.key["public"];        

            })
        },
        getUser = function(u)
        {
            var fd = new FormData();
            fd.append("getContact", true);
            fd.append("user", u);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res)
                buildContact(res);
            })
        }
        return {
            init: function(u)
            {
                getUser(u);
            },
            click: function(ev)
            {
                var e = ev.target,
                user = hf.elCN("contact-username")[0].textContent;
                if (hf.isInside(e, hf.elCN("contact-view-container")[0]))
                {
                    if (hf.cN(e, "message"))
                    {
                        navigation.stateChange("compose");
                        messageDraft.init(user);
                    }
                    else if (hf.cN(e, "close"))
                    {
                        navigation.stateChange("contacts");
                    }
                }
            }
        }
    })(),
    contactList = (function()
    {
        var
        contactList,
        sorting = false,
        addContactTimeout,
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
                
                if (contactList.code == 0) return;

                // console.log(contactList);
                for (var user in contactList)
                {
                    var
                    selBut = hf.cEL("input", {class: "contact-checkbox", type: "checkbox"}),
                    contact = hf.cEL("div", {class: "contact"}),
                    displayname = hf.cEL("div", {class: "contact-displayname"}, contactList[user]["displayName"]);
                    username = hf.cEL("div", {class: "contact-username"}, user);

                    contact.appendChild(selBut);
                    contact.appendChild(displayname);
                    contact.appendChild(username);

                    frag.appendChild(contact);
                }
                hf.elCN("contact-list")[0].appendChild(frag);
            });
        },
        getList = function()
        {
            var fd = new FormData();
            fd.append("listContacts", true);
            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                contactList = JSON.parse(res);
                if (contactList.code != null)
                    error.init(contactList.message, 5);

                sorting = false;
                sortContacts();
                buildList();
            });
        },
        addContact = function(u)
        {
            if (contactList[u])
            {
                navigation.stateChange("compose");
                messageDraft.init(u);
                return;
            }

            var fd = new FormData();
            fd.append("addContact", true);
            fd.append("contact", u);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);
                if (res.code == 0 || res.code == -1)
                {
                    error.init(res.message, 3);
                }
                else
                {
                    // error.init(res.message, 3);
                    // contactList[u] = [];
                    getList();
                }
            });
        },
        // deleteContact = function(i, u)
        // {
        //     var fd = new FormData();
        //     fd.append("username", u);

        //     hf.ajax("POST", fd, "phpSrc/deleteContact.php", function(res)
        //     {
        //         // console.log(res);
        //         // res = JSON.parse(res);
        //         if (res.code == null)
        //         {
        //             delete contactList[u];
        //             buildList();
        //         }
        //         else
        //         {
        //             error.init(res.message, 3);
        //         }
        //     });
        // },
        deleteMultipleContacts = function()
        {
            // console.log(contactList);
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
            fd.append("deleteMultipleContacts", true);
            fd.append("contacts", JSON.stringify(contactList));
            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);

                if (res.code == 0 || res.code == -1)
                {
                    contactList = backupContactList;
                    error.init(res.message,3);
                }
                else
                {
                    error.init(res.message, 3);
                }

                delBut.style.display = "none";
                buildList();
            });
        },
        selectAll = function(e)
        {
            var checkboxes = hf.elCN("contact-checkbox"),
            delBut = hf.elCN("delete-multiple-contact-button")[0];

            if (e.checked)
            {
                delBut.style.display = "block";

                for (var i = 0, len = checkboxes.length; i < len; i++)
                    checkboxes[i].checked = true;
            }
            else
            {
                for (var i = 0, len = checkboxes.length; i < len; i++)
                    checkboxes[i].checked = false;

                delBut.style.display = "none";
            }
        },
        sortContacts = function()
        {
            var
            newContactList = {},
            keys = [];

            for (var key in contactList)
            {
                if (contactList.hasOwnProperty(key))
                    keys.push(key);
            }
            keys.sort();

            if (sorting)
                keys.reverse();

            for (var i = 0, len = keys.length; i < len; i++)
                newContactList[keys[i]] = contactList[keys[i]];

            contactList = newContactList;
            sorting = !sorting;
        },
        checkboxClick = function(e)
        {
            var
            selectAllCheck = hf.elCN("contact-list-heading-checkbox")[0],
            checkboxes = hf.elCN("contact-checkbox"),
            delBut = hf.elCN("delete-multiple-contact-button")[0];
            // console.log(delBut);

            //if any are selected view delete button
            for (var i = 0, len = checkboxes.length; i < len; i++)
            {
                if (checkboxes[i].checked)
                {
                    delBut.style.display = "block";
                    return;
                }
            }
            selectAllCheck.checked = false;
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
                    if (target = hf.rTarget(e, "contact"))
                    {
                        if (hf.cN(e, "contact-checkbox"))
                        {
                            checkboxClick(e);
                            return;
                        }

                        var user = target.children[2].textContent;

                        navigation.stateChange("viewContact");
                        viewContact.init(user);
                        // navigation.stateChange("compose");
                        // messageDraft.init(user);
                    }
                    else if (hf.cN(e, "add-contact-button"))
                    {
                        var user = hf.elCN("add-contact-input")[0].value;

                        clearTimeout(addContactTimeout);
                        addContactTimeout = setTimeout(function()
                        {
                            addContact(user)
                        }, 200);
                    }
                    else if (hf.cN(e, "contact-list-heading-checkbox"))
                    {
                        selectAll(e);
                    }
                    else if (hf.cN(e, "contact-list-heading-username"))
                    {
                        sortContacts();
                        buildList();
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
        clearFiles = function()
        {
            imgs = [];
            fls = [];
            fileList = [];
            imgList = [];
        },
        sendPlaintext = function(rec, pt, el)
        {
            if (imgs.length > 0)
            {
                // Convert each File to Object
                var imgList_obj = [];
                for ( var i = 0 ; i < imgList.length ; i++ )
                {
                    var img_obj = {
                        'lastModified' : imgList[i].lastModified,
                        'name' : imgList[i].name,
                        'size' : imgList[i].size,
                        'type' : imgList[i].type,
                    }
                    imgList_obj.push( img_obj );
                }

                pt += "<div class=image-file-list>";
                pt += JSON.stringify( imgList_obj );
                pt += "</div>";

                pt += "<div class=view-message-images-container>";

                for (var i = 0, len = imgs.length; i < len; i++)
                    pt += imgs[i];

                pt += "</div>";
            }
            if (fls.length > 0)
            {
                // Convert each File to Object
                var fileList_Obj = [];
                for ( var i = 0 ; i < fileList.length ; i++ )
                {
                    var fileObj = {
                        'lastModified' : fileList[i].lastModified,
                        'name' : fileList[i].name,
                        'size' : fileList[i].size,
                        'type' : fileList[i].type,
                    }
                    fileList_Obj.push( fileObj );
                }

                pt += "<div class=file-file-list>";
                pt += JSON.stringify( fileList_Obj );
                pt += "</div>";

                pt += "<div class=view-message-files-container>";

                for (var i = 0, len = fls.length; i < len; i++)
                    pt += fls[i];

                pt += "</div>";
            }
            // console.log(pt);
            if (pt === "")
            {
                error.init("Your message is empty.", 3);
                return;
            } 

            var 
            fd = new FormData(),
            size = pt.length;

            fd.append("plaintext", pt);
            fd.append("recipient", rec);

            for (var i=pt.length-1; i >= 0; i--) 
            {
                var code = pt.charCodeAt(i);
                if (code > 0x7f && code <= 0x7ff) size++;
                else if (code > 0x7ff && code <= 0xffff) size+=2;
                if (code >= 0xDC00 && code <= 0xDFFF) i--;
            }

            if (size > 15000000)
            {
                error.init("Messages can not be greater than 15MB in size", 3);
                return;
            }
            if (hf.elCN("send-message-box")[0].children[0].value == "")
            {
                error.init("You must specify a recipient for this message.", 3);
                return;
            }

            fd.append("sendMessage", true);
            fd.append("messageSize", size);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);
                if (res.code != null)
                {
                    error.init(res.message, 3);
                }
                clearFiles();
                navigation.stateChange("contacts");
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
                files = fileInput.files,
                sendMessageBox = hf.elCN("send-message-box")[0],
                imageStage = hf.cEL("div", {class: "image-stage"});
                fileStage = hf.cEL("div", {class: "file-stage"});

                sendMessageBox.appendChild(imageStage);
                sendMessageBox.appendChild(fileStage);

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
                                // console.log(e.target.result);
                                var
                                i = "<div class=img-container><div class=img style=background-image:url(";
                                i += e.target.result;
                                i += ");><div><p>Download</p></div></div></div>";

                                imgs.push(i);

                                //Add images to stage
                                var
                                ii = "<div class=img-container><div class=img style=background-image:url(";
                                ii += e.target.result;
                                ii += ");><div><p>Delete</p></div></div></div>";

                                imageStage.innerHTML += ii;
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

                                if (file.size > 10000)
                                {
                                    f += (file.size / 1000000).toFixed(2) + "MB";
                                }
                                else
                                {
                                    f += (file.size / 1000).toFixed(2) + "KB";
                                }
                                f += "</p><p>Download</p></a></div>";

                                var
                                ff = "<div class=fl-container><a target=_blank href=";
                                // ff += res.target.result;
                                ff += "><p>";
                                ff += file.name + "<br>";

                                if (file.size > 10000)
                                {
                                    ff += (file.size / 1000000).toFixed(2) + "MB";
                                }
                                else
                                {
                                    ff += (file.size / 1000).toFixed(2) + "KB";
                                }
                                ff += "</p><p>Delete</p></a></div>";

                                fls.push(f);
                                fileStage.innerHTML += ff;
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
                imgs[i] = "0".repeat(imgs[i].length);

            document.body.removeChild(e);
        },
        imageClickStage = function(img)
        {
            var
            container = hf.elCN("image-stage")[0],
            index = Array.prototype.indexOf.call(container.children, img);

            imgs.splice(index, 1);
            imgList.splice(index, 1);
            container.removeChild(container.children[index]);
        },
        fileClickStage = function(file)
        {
            var
            container = hf.elCN("file-stage")[0],
            index = Array.prototype.indexOf.call(container.children, file);

            fls.splice(index, 1);
            fileList.splice(index, 1);
            container.removeChild(container.children[index]);
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
                    clearFiles();
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
                    dis = sendMessageBox.getElementsByTagName("button")[2],
                    fileContainer = hf.elCN("file-stage")[0],
                    imgContainer = hf.elCN("image-stage")[0];
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
                    }
                    else if (e == dis)
                    {
                        closeMessage(e.parentNode);
                        clearFiles();
                        navigation.stateChange("messages");
                    }
                    else if (hf.isInside(e, imgContainer))
                    {
                        ev.preventDefault();
                        var img;
                        if (img = hf.rTarget(e, "img-container"))
                        {
                            // console.log("message draft");
                            imageClickStage(img);
                        }
                    }
                    else if (hf.isInside(e, fileContainer))
                    {
                        ev.preventDefault();
                        var file;
                        if (file = hf.rTarget(e, "fl-container"))
                        {
                            fileClickStage(file);
                        }
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
            var fd = new FormData();
            fd.append("viewMessage", true);
            hf.ajax("GET", null, "templates/viewMessage.php", function(res)
            {
                var
                container = hf.cEL("div", {class: "module-container view-message-container"}),
                frag = document.createDocumentFragment(),
                s = currentMessage["size"],
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
                
                if (contactList.code == 0) return;

                var
                sender = hf.elCN("view-message-sender")[0],
                timestamp = hf.elCN("view-message-timestamp")[0],
                size = hf.elCN("view-message-size")[0],
                message = hf.elCN("view-message-message")[0];

                sender.innerHTML = "From: " + currentMessage["displayname"] + " &lt; " + currentMessage["sender"] + " &gt;";
                // sender.innerHTML += " <" + currentMessage["sender"] + ">";

                sender.dataset.username = currentMessage["sender"];

                timestamp.innerHTML = date.toLocaleString();
                size.innerHTML = "Size: " + hf.convertSize(currentMessage["size"]);
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
            // document.body.removeChild(e.parentNode.parentNode);
            
            //Clear the plaintext from memory, A little heavy handed
            // if (currentMessage)
                // currentMessage["plaintext"] = "0".repeat(currentMessage["plaintext"].length);
            currentMessage = {};
        },
        imageClick = function(img)
        {
            var
            anchor = hf.cEL("a", {target: "_blank"}),
            style = window.getComputedStyle(img.children[0]).backgroundImage,
            uri = style.slice(4, style.length-1),
            container = hf.elCN("view-message-images-container")[0],
            index = Array.prototype.indexOf.call(container.children, img);

            anchor.download = imgFileList[index].name;
            anchor.href = uri.slice( 1, uri.length - 1 ); // Add data without quotes

            // Force click the anchor to download the image
            document.body.appendChild( anchor );
            anchor.click();
            document.body.removeChild( anchor );
        },
        fileClick = function(file)
        {
            var
            anchor = hf.cEL("a", {target: "_blank"}),
            fileContainer = hf.elCN("view-message-files-container")[0],
            index = Array.prototype.indexOf.call(fileContainer.children, file.parentNode);

            anchor.download = flFileList[index].name;
            anchor.href = file.href;

            // Force click the anchor to download the file
            document.body.appendChild( anchor );
            anchor.click();
            document.body.removeChild( anchor );
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
                        navigation.stateChange("messages");
                    }
                    else if (hf.cN(e, "view-message-close-button"))
                    {
                        closeMessage(e);
                        navigation.stateChange("messages");
                    }
                    else if (hf.isInside(e, imgContainer))
                    {
                        ev.preventDefault();
                        var img;
                        if (img = hf.rTarget(e, "img-container"))
                        {
                            // console.log("view-message");
                            imageClick(img);
                        }
                    }
                    else if (hf.isInside(e, fileContainer))
                    {
                        ev.preventDefault();
                        var file;
                        if (file = hf.rTarget(e, "fl-container"))
                        {
                            fileClick(file.children[0]);
                        }
                    }
                }
            }
        }
    })(),
    messageList = (function()
    {
        var
        messageList = {},
        timestamps = [],
        sizes = [],
        users = [],
        timeSorting = true,
        sizeSorting = true,
        userSorting = true,
        numSorting = true,
        sortType = "time",
        currentPage = 0,
        getListTimeout,
        nested = true,
        nestedSort = [],
        buildItem = function(u, t)
        {
            var
            msg = hf.cEL("div", {class: "message"}),
            checkcont = hf.cEL("div", {class: "check-container"}),
            check = hf.cEL("input", {class: "message-checkbox", type: "checkbox"}),
            // username = hf.cEL("div", {class: "message-username"}, u),
            displayname = hf.cEL("div", {class: "message-username"}, messageList[u][t]["sender"]["displayName"]),
            fingerprint = hf.cEL("div", {class: "message-fingerprint"}, messageList[u][t]["id"].slice(0,7))
            size = hf.cEL("div", {class: "message-size"}, hf.convertSize(messageList[u][t]["size"])),
            date = new Date(messageList[u][t].timestamp * 1000),
            timestamp = hf.cEL("div", {class: "message-timestamp"}, hf.convertTime(date));

            displayname.dataset.username = u;
            timestamp.dataset.timestamp = messageList[u][t].timestamp;

            checkcont.appendChild(check);

            msg.appendChild(checkcont);
            msg.appendChild(size);
            msg.appendChild(displayname);
            msg.appendChild(fingerprint);
            msg.appendChild(timestamp);

            return msg;
        },
        buildList = function()
        {
            if (settings.nested)
            {
                hf.ajax("GET", null, "templates/nestedMessageList.php", function(res)
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
                    
                    if (messageList.code == 0) return;
                    
                    for (var obj in nestedSort)
                    {
                        var u = nestedSort[obj].user;

                        if (messageList[u].length == 0)
                            continue;
                        var
                        usr = hf.cEL("div", {class: "usr"}),
                        nummess = hf.cEL("div", {class: "num-messages"}, Object.keys(messageList[u]).length),
                        username = hf.cEL("div", {class: "username"}, u),
                        date = new Date(Object.keys(messageList[u])[Object.keys(messageList[u]).length-1] * 1000),
                        lastmess = hf.cEL("div", {class: "last-message"}, hf.convertTime(date));

                        lastmess.dataset.timestamp = Object.keys(messageList[u])[0]

                        usr.appendChild(nummess);
                        usr.appendChild(username);
                        usr.appendChild(lastmess);

                        frag.appendChild(usr);

                        var keys = Object.keys(messageList[u]);
                        keys.sort();
                        for (var i = keys.length-1; i >= 0; i--)
                        {
                            usr.appendChild(buildItem(u, keys[i]));
                        }
                    }
                    hf.elCN("message-list")[0].appendChild(frag);


                });
            }
            else
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
                    
                    if (messageList.code == 0) return;

                    var 
                    i = Math.floor(currentPage*settings.mNum),
                    count = 0;

                    if (sortType == "time")
                    {
                        for (var len = timestamps.length; i < len; i++)
                        {
                            if (count >= settings.mNum)
                                break;
                            for (var user in messageList)
                            {
                                if (!messageList[user][timestamps[i]])
                                    continue;
                                frag.appendChild(buildItem(user, timestamps[i]));
                                count++;
                            }
                        }
                    }
                    else if (sortType == "size")
                    {
                        var temp = JSON.parse(JSON.stringify(messageList));
                        for (var len = sizes.length; i < len; i++)
                        {
                            if (count >= settings.mNum)
                                break;
                            for (var user in temp)
                            {
                                for (var time in temp[user])
                                {   
                                    if (temp[user][time]["size"] == sizes[i])
                                    {
                                        if (count >= settings.mNum)
                                            break;
                                        frag.appendChild(buildItem(user, time));
                                        delete temp[user][time];
                                        count++;
                                    }
                                }
                            }
                        }
                    }
                    else if (sortType == "user")
                    {
                        for (var len = users.length; i < len; i++)
                        {
                            if (count >= settings.mNum)
                                break;
                            for (var u in messageList)
                            {
                                for (var t in messageList[u])
                                {
                                    if (messageList[u][t] == users[i])
                                    {
                                        if (count >= settings.mNum)
                                            break;
                                        frag.appendChild(buildItem(u, t));
                                        count++;
                                    }
                                }
                            }   
                        }
                    }
                    hf.elCN("message-list")[0].appendChild(frag);

                    var maxPages = (Math.ceil(timestamps.length / settings.mNum));
                    hf.elCN("message-list-pagenum-input")[0].value = currentPage + 1;
                    hf.elCN("message-list-pagenum-input")[0].setAttribute("max", maxPages);
                    hf.elCN("message-list-pagenum-total")[0].innerHTML = "of " + maxPages;
                    pagenumInputChange();

                    if (currentPage == 0)
                        hf.elCN("prev")[0].style.visibility = "hidden";
                    else
                        hf.elCN("prev")[0].style.visibility = "visible";
                    if (currentPage == Math.ceil(timestamps.length / settings.mNum)-1)
                        hf.elCN("next")[0].style.visibility = "hidden";
                    else
                        hf.elCN("next")[0].style.visibility = "visible";
                });
            }

        },
        viewMessage = function(u,t)
        {
            var
            fd = new FormData();

            fd.append("viewMessage", true);
            fd.append("username", u);
            fd.append("timestamp", t);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);
                if (res.code != null)
                {
                    error.init(res.message,3);
                }
                messageView.init(res);                
            });
        },
        showHideNested = function(target)
        {
            var
            messages = Array.prototype.slice.call(target.children, 3),
            display;

            if (messages[0].style.display == "block")
                display = "none";
            else
                display = "block";

            for (var mes in messages)
            {
                messages[mes].style.display = display;
            }
        },
        checkboxClick = function(e)
        {
            var
            selectAllCheck = hf.elCN("message-list-heading-checkbox")[0],
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
            selectAllCheck.checked = false;
            delBut.style.display = "none";
        },
        selectAll = function(e)
        {
            var checkboxes = hf.elCN("message-checkbox"),
            delBut = hf.elCN("delete-multiple-messages-button")[0];

            if (e.checked)
            {
                delBut.style.display = "block";
                for (var i = 0, len = checkboxes.length; i < len; i++)
                    checkboxes[i].checked = true;
            }
            else
            {
                for (var i = 0, len = checkboxes.length; i < len; i++)
                    checkboxes[i].checked = false;

                delBut.style.display = "none";
            }
        },
        delMessage = function(u, t)
        {
            var fd = new FormData();

            fd.append("deleteMessage", true);
            fd.append("timestamp", t);
            fd.append("username", u);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                // console.log(res);
                // res = JSON.parse(res);
                if (res.code == null)
                {
                    delete messageList[u][t];
                    sortType = "time";
                    timeSorting = true;
                    buildList();
                }
                else
                {
                    error.init(res.message, 3);
                }
            });
        },
        deleteMultipleMessages = function()
        {
            var
            newMessageList = messageList,
            deleteMessages = [],
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
                    user = checkboxes[i].parentNode.parentNode.children[2].dataset.username,
                    timestamp = checkboxes[i].parentNode.parentNode.children[4].dataset.timestamp;
                    
                    // console.log(user, timestamp);
                    deleteMessages.push(newMessageList[user][timestamp]["id"]);
                    delete newMessageList[user][timestamp];
                }
            }
            for (var user in newMessageList)
            {
                if (newMessageList[user].length == 0)
                    delete newMessageList[user];
            }

            messageList = newMessageList;

            fd.append("deleteMultipleMessages", true);
            fd.append("messages", JSON.stringify(messageList));
            fd.append("deleteMessages", JSON.stringify(deleteMessages));
            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);

                if (res.code != null)
                {
                    messageList = backupMessageList;
                    error.init(res.message, 3);
                }

                delBut.style.display = "none";
                sortType = "time";
                timeSorting = true;
                buildList();
            });
        },
        getList = function()
        {
            var fd = new FormData();
            fd.append("listMessages", true);
            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                messageList = JSON.parse(res);
                if (messageList.code != null)
                {
                    error.init(messageList.message, 5);
                }
                else
                {
                    nestedSort = [];
                    for (var user in messageList)
                    {
                        (function(u)
                        {
                            var temp = {};
                            temp = {
                                user: u,
                                last: Object.keys(messageList[u])[Object.keys(messageList[u]).length-1],
                                len: Object.keys(messageList[u]).length
                            }
                            nestedSort.push(temp);
                        })(user);
                    }
                    sortMessageListTimestamp();
                    sortNestedTime();
                }
                buildList();
            });
        },
        pagenumInputChange = function()
        {
            hf.elCN("message-list-pagenum-input")[0].onchange = function()
            {
                currentPage = hf.elCN("message-list-pagenum-input")[0].value - 1;
                buildList();
            }
        },
        sortMessageListTimestamp = function()
        {
            timestamps = [];
            for (var user in messageList)
                for (var time in messageList[user])
                    timestamps.push(time);

            timestamps.sort();

            if (timeSorting)
                timestamps.reverse();

            timeSorting = !timeSorting;
            sizeSorting = true;
            userSorting = true;
            sortType = "time";
        },
        sortMessageListSize = function()
        {
            sizes = [];
            for (var user in messageList)
                for(var time in messageList[user])
                    sizes.push(parseInt(messageList[user][time]["size"]));

            sizes.sort(function(a, b)
            {
                return a-b;
            });

            if (sizeSorting)
                sizes.reverse();

            sizeSorting = !sizeSorting;
            timeSorting = true;
            userSorting = true;
            currentPage = 0;
            sortType = "size";
        },
        sortMessageListUser = function()
        {
            users = [];
            for (var user in messageList)
                users.push(user);

            users.sort();

            if (userSorting)
                users.reverse();

            var tempUsers = [];
            for (var i = 0, len = users.length; i < len; i++)
            {
                for (var time in messageList[users[i]])
                    tempUsers.push(messageList[users[i]][time]);
            }
            users = tempUsers;

            userSorting = !userSorting;
            timeSorting = true;
            sizeSorting = true;
            sortType = "user";
        },
        sortNestedUser = function()
        {
            nestedSort.sort(function(a, b)
            {
                var 
                nameA = a.user.toLowerCase(),
                nameB = b.user.toLowerCase();
                return (nameA < nameB) ? -1 : (nameA > nameB) ? 1 : 0; 
            });
            if (!userSorting)
                nestedSort.reverse();

            userSorting = !userSorting;
            timeSorting = true;
            sizeSorting = true;
            sortType = "user";
        },
        sortNestedTime = function()
        {
            nestedSort.sort(function(a, b)
            {
                return a.last - b.last;
            })
            if (!timeSorting)
                nestedSort.reverse();

            timeSorting = !timeSorting;
            userSorting = true;
            sizeSorting = true;
            sortType = "time";
        },
        sortNestedNum = function()
        {
            nestedSort.sort(function(a, b)
            {
                return a.len - b.len; 
            });

            if (numSorting)
                nestedSort.reverse();

            numSorting = !numSorting;
            userSorting = true;
            sizeSorting = true;
            sortType = "time";
        },
        turnPage = function(dir)
        {
            var 
            items = timestamps.length,
            maxPages = Math.ceil(items / settings.mNum),
            prev = hf.elCN("prev")[0],
            next = hf.elCN("next")[0];

            if (dir == "prev")
            {
                currentPage--;
                if (currentPage < 0)
                {
                    currentPage = 0;
                    return;
                }
            }
            else if (dir == "next")
            {
                currentPage++;
                if (currentPage >= maxPages)
                {
                    currentPage = maxPages-1;
                    return;
                }
            }
        },
        findMessage = function(mes)
        {
            for (var user in messageList)
            {
                for (var time in messageList[user])
                {
                    if (messageList[user][time]["id"].match(mes))
                    {
                        navigation.stateChange("viewMessage");
                        viewMessage(user, time);                        
                    }

                }
            }
        };
        
        return{
            init: function()
            {
                sortType = "time";
                timeSorting = true;
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
                    if (target = hf.rTarget(e, "message"))
                    {
                        if (hf.cN(e, "message-checkbox"))
                        {
                            checkboxClick();
                            return;
                        }
                        var
                        user = target.children[2].dataset.username,
                        time = target.children[4].dataset.timestamp;

                        navigation.stateChange("viewMessage");
                        viewMessage(user, time);
                    }
                    else if (target = hf.rTarget(e, "usr"))
                    {
                        showHideNested(target);
                    }
                    else if (hf.cN(e, "refresh-messages-button"))
                    {
                        clearTimeout(getListTimeout);
                        getListTimeout = setTimeout(function(){
                            sortType = "time";
                            timeSorting = true;
                            getList();
                        },1000);
                    }
                    else if (hf.cN(e, "create-message-button"))
                    {
                        messageDraft.init();
                    }
                    else if (hf.cN(e, "message-list-heading-checkbox"))
                    {
                        selectAll(e);
                    }
                    
                    else if (hf.cN(e, "delete-multiple-messages-button"))
                    {
                        deleteMultipleMessages();
                        sortMessageListTimestamp();
                        buildList();
                    }
                    else if (hf.cN(e, "message-list-timestamp"))
                    {
                        sortMessageListTimestamp();
                        buildList();
                    }
                    else if (hf.cN(e, "message-list-username"))
                    {
                        sortMessageListUser();
                        buildList();
                    }
                    else if (hf.cN(e, "message-list-size"))
                    {
                        sortMessageListSize();
                        buildList();
                    }
                    else if (hf.cN(e, "message-list-nummessages"))
                    {
                        sortNestedNum();
                        buildList();
                    }
                    else if (hf.cN(e, "message-list-nestedusername"))
                    {
                        sortNestedUser();
                        buildList();
                    }
                    else if (hf.cN(e, "message-list-lastmessage"))
                    {
                        sortNestedTime();
                        buildList();
                    }
                    else if (hf.cN(e, "prev"))
                    {
                        turnPage("prev")
                        buildList();
                    }
                    else if (hf.cN(e, "next"))
                    {
                        turnPage("next");
                        buildList();
                    }
                    else if (hf.cN(e, "find-message-button"))
                    {
                        findMessage(hf.elCN("find-message-input")[0].value);
                    }
                }
            }
        }
    })(),
    settings = (function()
    {
        var
        mPerPageTimeout,
        getTemplate = function()
        {
            hf.ajax("GET", null, "templates/settings.php", function(res)
            {
                var
                container = hf.cEL("div", {class: "module-container settings-container"}),
                containerExists = hf.elCN("settings-container")[0];

                container.innerHTML = res;

                if (!containerExists)
                    document.body.appendChild(container);

                var
                avatar = hf.elCN("avatar-container")[0].children[0],
                username = hf.elCN("settings-username")[0],
                allowance = hf.elCN("settings-allowance")[0],
                displayname = hf.elCN("settings-displayname")[0],
                nestedCheck = hf.elCN("nestedCheckbox")[0],
                messageNum = hf.elCN("mPerPage")[0];

                avatar.style.backgroundImage = "url(" + settings.avatar + ")";
                username.innerHTML = settings.user;

                allowance.innerHTML = (settings.allowance/1000000000 * 100).toPrecision(2) + "% of 1GB";
                displayname.value = settings.displayName;
                nestedCheck.checked = settings.nested;
                messageNum.value = settings.mNum;
                nestChange();
                mPerPageChange();
                displayName();
            })
        },
        getSettings = function(callback)
        {
            var fd = new FormData();
            fd.append("getSettings", true);
            hf.ajax("POST", fd, "phpSrc/main.php", function(r)
            {
                r = JSON.parse(r);

                if (r.code != null)
                    error.init(r.message, 3);

                settings.user = r["user"];
                settings.mNum = r["mPerPage"];
                settings.displayName = r["displayName"];
                settings.allowance = r["allowance"];

                r["nested"] == "true" ? settings.nested = true : settings.nested = false;

                var avFD = new FormData();
                avFD.append("getAvatar", true);
                avFD.append("user", settings.user);

                hf.ajax("POST", avFD, "phpSrc/main.php", function(res)
                {
                    settings.avatar = res;
                    callback();                   
                });
            });
        },
        changeAvatar = function()
        {
            var
            reader = new FileReader(),
            fd = new FormData(),
            avatarInput = hf.elCN("avatar-input")[0],
            navAvatar = hf.elCN("nav-avatar")[0],
            avatarImg = hf.elCN("avatar")[0];

            avatarInput.click();

            avatarInput.onchange = function()
            {
            if (!avatarInput.files[0].type.match("image.*"))
            {
                error.init("The file you selected is not an image file.", 5);
                return;                
            }
            if (avatarInput.files[0].size > 500000)
            {
                error.init("The image can not be larger than 500KB in size.", 3);
                return;
            }
            reader.onload = (function()
            {
            return function(res)
            {
                fd.append("changeAvatar", true);
                fd.append("avatar", res.target.result);
                settings.avatar = res.target.result;
                hf.ajax("POST", fd, "phpSrc/main.php", function(r)
                {
                    r = JSON.parse(r);
                    if (r.code == 1)
                    {
                        avatarImg.style.backgroundImage = "url(" + settings.avatar + ")";
                        navAvatar.style.backgroundImage = "url(" + settings.avatar + ")";
                    }
                    else if (r.code == 0 || r.code == -1)
                    {
                        error.init(r.message, 3);
                    }
                })
            }
            })();
            reader.readAsDataURL(avatarInput.files[0]);
            }
        },
        downloadMessages = function()
        {
            var fd = new FormData();
            fd.append("downloadMessages", true);
            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                var a = hf.cEL("a", {target: "_blank", href: 'data:text/plain;charset=utf-8,' + encodeURIComponent(res)});
                res = JSON.parse(res);
                if (res.code != null)
                {
                    error.init(res.message, 5);
                    return;
                }
                a.download = "Decrypted-Messages.txt";
                a.click();
            })
        },
        changePassword = function()
        {   
            var
            newpw = hf.elCN("settings-newpw")[0],
            newpwagain = hf.elCN("settings-newpw-double")[0];

            if (newpw.value != newpwagain.value)
            {
                error.init("Those passwords don't match.", 3);
                return;
            }
            if (newpw.value == "" || newpwagain.value == "")
            {
                error.init("One of the password fields is empty.", 3);
                return;
            }
            var fd = new FormData();
            fd.append("password", newpw.value);
            fd.append("changePassword", true);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);
                if (res.code == 0 || res.code == -1)
                {
                    error.init(res.message, 3);
                    return;
                }

                error.init("Password has been changed successfully. Reloading the page in 3 seconds...");
                // console.log("Reloading page in 3 seconds...");
                var del = setTimeout(function()
                {
                    window.location.reload();
                },3000);
            })
        },
        updateSettings = function()
        {
            var
            numInput = hf.elCN("mPerPage")[0],
            nestedCheck = hf.elCN("nestedCheckbox")[0],
            displayNameInput = hf.elCN("settings-displayname")[0];

            var fd = new FormData();
            // console.log(displayNameInput.value);

            fd.append("updateSettings", true);
            fd.append("mPerPage", numInput.value);
            fd.append("displayName", displayNameInput.value);
            fd.append("nested", nestedCheck.checked);

            settings.displayName = displayNameInput.value;
            settings.nested = nestedCheck.checked;
            settings.mNum = numInput.value;

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                res = JSON.parse(res);

                if (res.code != null)
                    error.init(res.message, 3);
            });
        },
        nestChange = function()
        {
            hf.elCN("nestedCheckbox")[0].onchange = function()
            {
                updateSettings();
            }
        },  
        mPerPageChange = function()
        {
            hf.elCN("mPerPage")[0].onchange = function()
            {
                clearTimeout(mPerPageTimeout);
                mPerPageTimeout = setTimeout(function()
                {
                   updateSettings();
                },1000);
            }
        },
        displayName = function()
        {
            hf.elCN("settings-displayname")[0].onblur = function(){
                updateSettings();
            }
        }
        return {
            user: "",
            displayName: "",
            avatar: "",
            nested: false,
            mNum: 10,
            allowance: 0,
            init: function()
            {
                getSettings(getTemplate);
            },
            getUserSettings: function()
            {
                getSettings(navigation.init);
            },
            click: function(ev)
            {
                var
                e = ev.target,
                settingsModule = hf.elCN("settings-container")[0],
                avatarContainer = hf.elCN("avatar-container")[0];

                if (hf.isInside(e, settingsModule))
                {
                    if (hf.isInside(e, avatarContainer))
                    {
                        changeAvatar();
                    }
                    else if (hf.cN(e, "settings-changepw-button"))
                    {
                        var check = confirm("All your messages will be deleted due to a change in your secret key. Do you wish to continue?");
                        if (check)
                            changePassword();
                    }
                    else if (hf.cN(e, "settings-download-creds"))
                    {

                    }
                    else if (hf.cN(e, "settings-download-messages"))
                    {
                        downloadMessages();
                    }
                }
            }
        }
    })(),
    navigation = (function()
    {
        var
        buildNavigation = function(res ,callback)
        {
            var
            container = hf.cEL("div", {class: "navigation-container"});
            container.innerHTML = res;

            document.body.appendChild(container);
            var avatar = hf.elCN("nav-avatar")[0];
            if (avatar)
            {
                avatar.style.backgroundImage = "url(" + settings.avatar + ")";
                callback();
            } 
        },
        getTemplate = function()
        {
            hf.ajax("GET", null, "templates/navigation.php", function(res){
                buildNavigation(res, function()
                {
                    changeState("messages");
                });
            })
        },
        setState = function()
        {
            var
            body = document.body,
            nav = hf.elCN("navigation-container")[0];

            (function()
            {
                for (var i = body.children.length-1; i > 0; i--)
                {
                    if (hf.cN(body.children[i], "navigation-container"))
                        continue;
                    body.removeChild(body.children[i]);
                }
            })();

            (function()
            {
                for (var i = 0, len = nav.children.length; i < len; i++)
                    nav.children[i].classList.remove("active");
            })();
        },
        changeState = function(state)
        {
            setState();
            appState = state;
            switch (state)
            {
                case "compose":
                {
                    hf.elCN("nav-compose")[0].classList.add("active");
                    messageDraft.init();
                    break;
                }
                case "messages":
                {
                    hf.elCN("nav-messages")[0].classList.add("active");
                    messageList.init();
                    break;
                }
                case "contacts":
                {
                    hf.elCN("nav-contacts")[0].classList.add("active");
                    contactList.init();
                    break;
                }
                case "settings":
                {
                    hf.elCN("nav-settings")[0].classList.add("active");
                    settings.init();
                    break;
                }
                case "viewMessage":
                {
                    break;
                }
                case "viewContact":
                {
                    break;
                }
            }
        };
        return {
            init: function()
            {
                getTemplate();
            },
            stateChange: function(state)
            {
                changeState(state);
            },
            click: function(ev)
            {
                var
                e = ev.target,
                clicked,
                navContainer = hf.elCN("navigation-container")[0];

                if (hf.isInside(e, navContainer))
                {
                    if (clicked = hf.rTarget(e, "nav-compose"))
                    {
                        changeState("compose");
                    }
                    else if (clicked = hf.rTarget(e, "nav-messages"))
                    {
                        changeState("messages");
                    }
                    else if (clicked = hf.rTarget(e, "nav-contacts"))
                    {
                        changeState("contacts");
                    }
                    else if (clicked = hf.rTarget(e, "nav-settings"))
                    {
                        changeState("settings");
                    }
                    else if (hf.isInside(e, hf.elCN("nav-avatar-container")[0]))
                    {
                        changeState("settings");
                    }
                }
            }
        }
    })(),
    error = (function()
    {   
        var
        errorMessageText,
        delay,
        errorMessageContainer,
        errorTimeout,
        getTemplate = function()
        {
            hf.ajax("GET", null, "templates/error.php", function(res)
            {
                errorMessageContainer = hf.cEL("div", {class: "error-container"});
                errorMessageContainer.innerHTML = res;

                if (!hf.elCN("error-container")[0])
                {
                    document.body.appendChild(errorMessageContainer);
                }

                var errorMessage = hf.elCN("error-message")[0];
                errorMessage.innerHTML = errorMessageText;

                if (delay)
                {
                    clearTimeout(errorTimeout);
                    errorTimeout = setTimeout(function()
                    {
                        if (hf.elCN("error-container")[0])
                            document.body.removeChild(hf.elCN("error-container")[0]);
                        delay = null;
                    },delay * 1000);
                }

            });
        };
        return {
            init: function(msg, del)
            {
                errorMessageText = msg;
                delay = del;
                getTemplate();
            },
            click: function(ev)
            {
                var e = ev.target;

                if (hf.isInside(e, errorMessageContainer))
                {
                    document.body.removeChild(errorMessageContainer);
                }
            }
        }
    })(),
    login = (function()
    {
        var
        init = function()
        {
            document.body.innerHTML = "";
            settings.getUserSettings();
        },
        submitCreds = function(un, pw)
        {
            if (un === "") return;
            if (pw === "") return;

            //send creds to phpSrc/login.php
            var fd = new FormData();

            fd.append("login", true);
            fd.append("username", un);
            fd.append("password", pw);

            hf.ajax("POST", fd, "phpSrc/main.php", function(res)
            {
                if (res)
                {
                    var
                    r = JSON.parse(res);
                    if (r.code == 1)
                    {
                        //Logged in!
                        error.init(r.message, 3);
                        init();
                    }
                    else
                    {
                        //Something failed
                        error.init(r.message, 3);
                    }
                }
            })
        }
        return{
            checkSession:function()
            {
                var fd = new FormData();
                fd.append("checkSession", true);
                hf.ajax("POST", fd, "phpSrc/main.php", function(res)
                {
                    res = JSON.parse(res)
                    if (res.code == 1)
                    {
                        error.init(res.message, 3);
                        init();
                    }
                })
            },
            click: function(ev)
            {
                var
                e = ev.target,
                loginModule = hf.elCN("login-box")[0];

                if (hf.isInside(e, loginModule))
                {
                    var
                    un = loginModule.getElementsByTagName("input")[0],
                    pw = loginModule.getElementsByTagName("input")[1],
                    sub = loginModule.getElementsByTagName("button")[0];
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
            },
            keypress: function(ev)
            {
                if (hf.isInside(ev.target, hf.elCN("login-password")[0]))
                {
                    if (ev.keyCode == 13)
                    {
                        hf.elCN("login-submit-button")[0].click();
                    }
                }
            }
        };
    })();
    return {
        checkSession: function()
        {
            login.checkSession();
        },
        clicked: function(ev)
        {
            switch (appState)
            {
                case "compose":
                {
                    messageDraft.click(ev);
                    break;
                }
                case "messages":
                {
                    messageList.click(ev);
                    break;
                }
                case "viewMessage":
                {
                    messageView.click(ev);
                    messageDraft.click(ev);
                    break;
                }
                case "viewContact":
                {
                    viewContact.click(ev);
                    break;
                }
                case "contacts":
                {
                    contactList.click(ev);
                    break;
                }
                case "settings":
                {
                    settings.click(ev);
                    break;
                }
            }
            login.click(ev);
            navigation.click(ev);
            error.click(ev);
        },
        keypress: function(ev)
        {
            login.keypress(ev);
        }
    };
})();

window.onload = function()
{
    APP.checkSession();
}
window.onclick = function(ev)
{
    APP.clicked(ev);
}
window.onkeypress = function(ev)
{
    APP.keypress(ev);
}
