<template>
  <div>
    <v-data-table
      :headers="headers"
      :items="items"
      :options.sync="options"
      :server-items-length="total"
      :loading="loading"
      :page.sync="page"
      class="elevation-1"
    >
    <template v-slot:item.login_ip="{ item }">
        {{ item.extra.login_ip}}
    </template>
    <template v-slot:item.detail="{ item }">
        <span v-if="item.extra.visit_history">    访问{{item.extra.visit_history.length}}本    </span>
        <span v-if="item.extra.read_history">     阅读{{item.extra.read_history.length}}本     </span>
        <span v-if="item.extra.push_history">     推送{{item.extra.push_history.length}}本     </span>
        <span v-if="item.extra.download_history"> 下载{{item.extra.download_history.length}}本 </span>
        <span v-if="item.extra.upload_history">   上传{{item.extra.upload_history.length}}本   </span>
    </template>
    <template v-slot:item.actions="{ item }">
            <v-menu offset-y right>
                <template v-slot:activator="{on}">
                <v-btn color="primary" small v-on="on" >操作 <v-icon small>more_vert</v-icon></v-btn>
                </template>
                <v-list>
                    <v-list-item v-if="! item.is_active" @click="setuser(item.id, {'active': true})" >
                        <v-list-item-title> 免邮箱认证，直接激活账户 </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="item.is_admin" @click="setuser(item.id, {'admin': false})" >
                        <v-list-item-title> 取消管理员 </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-else @click="setuser(item.id, {'admin': true})" >
                        <v-list-item-title> 设置为管理员 </v-list-item-title>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item @click="setuser(item.id, {'permission': 'L'})" @click2="alert('error', '暂未支持该功能，敬请期待后续版本更新')" >
                        <v-list-item-title><v-icon>delete</v-icon> 禁用账号登陆 </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
    </template>
    </v-data-table>
  </div>
</template>

<script>
export default {
    data: () => ({
        page: 1,
        items: [],
        total: 0,
        loading: true,
        options: {},
        headers: [
            { text: 'ID',       sortable: true,  value: 'id',         },
            { text: '用户名',   sortable: true,  value: 'username'    },
            { text: '昵称',     sortable: false, value: 'name'        },
            { text: 'Email',    sortable: true,  value: 'email'       },
            { text: '注册平台', sortable: false, value: 'provider'    },
            { text: '注册时间', sortable: true,  value: 'create_time' },
            { text: '登录时间', sortable: true,  value: 'access_time' },
            { text: '登录IP',   sortable: false, value: 'login_ip'    },
            { text: '详情',     sortable: false, value: 'detail'      },
            { text: '操作',     sortable: false, value: 'actions'     },
        ],
    }),
    watch: {
        options: {
            handler () {
                this.getDataFromApi();
            },
            deep: true,
        },
    },
    mounted () {
        this.getDataFromApi();
    },
    computed: {
        pageCount: function() {
            return parseInt(this.total / 20);
        },
    },
    methods: {
        getDataFromApi () {
            this.loading = true;
            const { sortBy, sortDesc, page, itemsPerPage } = this.options;

            var data = new URLSearchParams();
            if ( page         != undefined ) { data.append('page', page)         }
            if ( sortBy       != undefined ) { data.append('sort', sortBy)       }
            if ( sortDesc     != undefined ) { data.append('desc', sortDesc)     }
            if ( itemsPerPage != undefined ) { data.append('num',  itemsPerPage) }
            this.backend('/admin/users?'+data.toString())
            .then(rsp => {
                if ( rsp.err != 'ok' ) {
                    this.items = [];
                    this.total = 0;
                    this.loading = false;
                    alert( rsp.msg );
                    return false;
                }
                this.items = rsp.users.items;
                this.total = rsp.users.total;
                this.loading = false;
            });
        },
        setuser(uid, action) {
            action.id = uid;
            this.backend("/admin/users", {
                body: JSON.stringify(action),
                method: "POST",
            })
            .then(rsp => {
                if ( rsp.err == 'ok' ) {
                    this.alert("success", "成功！");
                } else {
                    this.alert("error", rsp.msg );
                }
            });
        },
    },
}
</script>

