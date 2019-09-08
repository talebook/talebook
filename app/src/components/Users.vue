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
        Actions
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
            this.backend('/sys/users?'+data.toString()).then(rsp => rsp.json() )
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
        }
    },
}
</script>

