class templateV2 {
    constructor() {
        this.root = null;
        this.engine = new Engine();
    }
    render(com, data) {
        let dom = this.engine.render(com, data);
        this.root.appendChild(dom);
    }
    mounted(dom) {
        this.root = dom;
        return this
    }
}
// 转化
class Engine {
    constructor() {
        this.nodes = new Map();
    }
    render(temp, data) {
        const re1 = /<(\w+)\s*([^>]*)>([^<]*)<\/\1>/gm;// 匹配<div class="a">xxx</div>
        const re2 = /<(\w+)\s*([^(/>)]*)\/>/gm; // 匹配<img src="a" />
        temp = temp.replace(/\n/gm, "");
        while (re1.test(temp)) {
            temp = temp.replace(re1, (s0, s1, s2, s3) => {
                let attr = this.parseAttribute(s2, data);
                let node = new Vnode(s1, attr, [], null, s3);
                this.nodes.set(node.uuid, node);
                return `(${node.uuid})`
            });
            temp = temp.replace(re2, (s0, s1, s2) => {
                let attr = this.parseAttribute(s2, data);
                let node = new Vnode(s1, attr, [], null, "");
                this.nodes.set(node.uuid, node);
                return `(${node.uuid})`;
            })
        }
        let rootNode = this.parseToNode(temp);
        let dom = this.parseNodeToDom(rootNode, data);
        return dom;
    }
    parseToNode(temp) {
        let re = /\((.*?)\)/g;
        let stack = [];
        let parent = new Vnode("root", {}, [], null, temp, null);
        stack.push(parent);
        while (stack.length > 0) {
            let pnode = stack.pop();
            let nodestr = pnode.childrenTemplate.trim();
            re.lastIndex = 0;
            [...nodestr.matchAll(re)].forEach(item => {
                let n = this.nodes.get(item[1]);
                let newn = new Vnode(
                    n.tag,
                    n.attr,
                    [],
                    pnode,
                    n.childrenTemplate,
                    null
                );
                pnode.children.push(newn);
                stack.push(newn);
            })
        }
        return parent.children[0] ? parent.children[0] : {};
    }
    parseNodeToDom(root, data) {
        let fragment = document.createDocumentFragment();
        let stack = [[root, fragment, data]];
        while (stack.length > 0) {
            let [pnode, pdom, scope] = stack.shift();
            if (pnode.attr.get("v-if")) {
                let [key, prop] = pnode.attr.get("v-if").split('.');
                key = key.trim();
                prop = prop.trim();
                let newnode = new Vnode(
                    pnode.tag,
                    pnode.attr,
                    pnode.children,
                    pnode.parent,
                    pnode.childrenTemplate
                );
                let newScope = {};
                if (!scope[prop]) {
                    Object.assign(newScope, scope);
                } else {
                    newScope[key] = scope[prop];
                }

                let html = this.scopeHtmlParse(newnode, data, newScope);
                let el = this.createElement(newnode, html);
                this.scopeAttrParse(el, newnode, data, newScope);
                if (el.attributes['v-if'].value == 'false') {
                    continue;
                }
                el.removeAttribute('v-if');// 去掉v-if属性
                pdom.appendChild(el);
                newnode.children.forEach(item => {
                    stack.push([item, el, newScope])
                })
            } else {
                let html = this.scopeHtmlParse(pnode, data, scope);
                let el = this.createElement(pnode, html);
                this.scopeAttrParse(el, pnode, data, scope);
                pdom.appendChild(el);
                pnode.children.forEach(item => {
                    stack.push([item, el, scope])
                })
            }
        }
        return fragment;
    }
    scopeHtmlParse(node, globalScope, curScope) {
        return node.childrenTemplate.replace(/\{\{(.*?)\}\}/g, (s0, s1) => {
            let props = s1.split('.');
            let val = curScope[props[0]] || globalScope[props[0]];
            props.slice(1).forEach(item => {
                val = val[item];
            });
            return val;
        })
    }
    createElement(node, html) {
        let ignoreAttr = ["for", "click"];
        let dom = document.createElement(node.tag);
        for (let [key, val] of node.attr) {
            if (!ignoreAttr.includes(key)) {
                dom.setAttribute(key, val);
            }
        }
        if (node.children.length === 0) {
            dom.innerHTML = html;
        }
        return dom;
    }
    parseAttribute(str, data) {
        let attr = new Map();
        str = str.trim();
        str.replace(/(\w+|v-if)\s*=['"](.*?)['"]/gm, (s0, s1, s2) => {
            console.log(data)
            attr.set(s1, s2);
            return s0;
        })
        return attr;
    }
    scopeAttrParse(el, node, globalScope, curScope) {
        for (let [key, val] of node.attr) {
            let result = /\{\{(.*?)\}\}/.exec(val);
            if (key === 'v-if') {
                el.setAttribute(key, curScope[val.split('.')[0]][val.split('.')[1]])
            }
            if (result && result[1].split('.')) {
                let props = result[1].split('.');
                let val = curScope[props[0]] || globalScope[props[0]];
                props.slice(1).forEach(item => {
                    val = val[item];
                });
                el.setAttribute(key, val);
            }
        }
    }
}
// 节点属性
class Vnode {
    constructor(tag, attr, children, parent, childrenTemplate) {
        this.tag = tag;
        this.attr = attr;
        this.children = children;
        this.parent = parent;
        this.childrenTemplate = childrenTemplate;
        this.uuid = this.uuid();
    }
    uuid() {
        return (
            Math.random() * 10000000000 +
            Math.random() * 100000 +
            Date.now()
        ).toString(36); // 取36进制
    }
}
let v1 = new templateV2().mounted(document.getElementsByClassName("container")[0]);
v1.render(
    `<div class="newslist">
        <div class="img" v-if="info.showImage"><img src="{{image}}"/></div>
        <div class="date" v-if="info.showDate">{{info.name}}</div>
        <div class="img">{{info.name}}</div>
    </div>`,
    {
        image: "some img",
        info: { showImage: true, showDate: false, name: "aaa" }
    }
);
