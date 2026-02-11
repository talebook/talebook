<template>
  <v-form ref="form" @submit.prevent="save">
    <v-row align="start">
      <v-col cols="3">
        <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">头像</div>
      </v-col>
      <v-col cols="9">
        <v-img class="float-left" height="80" contain :src="user.avatar"></v-img>
        <div class="text-subtitle-2 text-medium-emphasis">
          <a href="https://cravatar.cn/avatar" target="_blank">点击修改</a>
        </div>
      </v-col>

      <v-col cols="3">
        <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">用户名</div>
      </v-col>
      <v-col cols="9"><p class="pt-3 mb-0">{{ user.username }}</p></v-col>

      <v-col cols="3">
        <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">邮箱</div>
      </v-col>
      <v-col cols="9">
        <p class="pt-3 mb-0">
          {{ user.email }}
          <a href="#" v-if="!user.is_active" @click.prevent="send_active_email">重新发送激活邮件</a>
        </p>
      </v-col>

      <v-col cols="3">
        <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">密码</div>
      </v-col>
      <v-col cols="9">
        <div class="text-subtitle-2 text-medium-emphasis pa-0">
          <a href="#" @click.stop.prevent="show_pass = !show_pass">点击修改</a>
        </div>
        <div v-if="show_pass">
          <v-text-field solo v-model="user.password0" label="当前密码" type="password" autocomplete="new-password0"
            :rules="[rules.pass]"></v-text-field>
          <v-text-field solo v-model="user.password1" label="新密码" type="password" autocomplete="new-password1"
            :rules="[rules.pass]"></v-text-field>
          <v-text-field solo v-model="user.password2" label="确认密码" type="password" autocomplete="new-password2"
            :rules="[valid]"></v-text-field>
        </div>
      </v-col>

      <v-col cols="3">
        <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">昵称</div>
      </v-col>
      <v-col cols="9">
        <v-text-field solo v-model="user.nickname" label="昵称" type="text" autocomplete="new-nickname"
          :rules="[rules.nick]"></v-text-field>
      </v-col>

      <v-col cols="3">
        <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">Kindle地址</div>
      </v-col>
      <v-col cols="9">
        <v-text-field solo v-model="user.kindle_email" label="Kindle" type="text" autocomplete="new-email"
          :rules="[rules.email]"></v-text-field>
      </v-col>
      <v-col cols="12">
        <div class="text-center">
          <v-btn dark large rounded color="orange" @click="save">保存</v-btn>
        </div>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main'

const { $backend, $alert } = useNuxtApp()
const router = useRouter()
const mainStore = useMainStore()

const user = ref({})
const show_pass = ref(false)
const form = ref(null)

useHead({
  title: "用户中心",
})

const rules = {
  pass: v => v == undefined || v.length == 0 || v.length >= 8 || 'Min 8 characters',
  nick: v => v == undefined || v.length == 0 || v.length >= 2 || 'Min 2 characters',
  email: function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return email == undefined || email.length == 0 || re.test(email) || "Invalid email format";
  },
}

const valid = (v) => {
  return v == user.value.password1 || "Password are not same."
}

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid) {
    return false;
  }

  var d = {
    'password0': user.value.password0,
    'password1': user.value.password1,
    'password2': user.value.password2,
    'nickname': user.value.nickname,
    'kindle_email': user.value.kindle_email,
  }

  $backend('/user/update', {
    method: 'POST',
    body: JSON.stringify(d),
  })
  .then(rsp => {
    if (rsp.err != 'ok') {
      $alert('error', rsp.msg)
    } else {
      mainStore.setNavbar(true);
      router.push("/");
    }
  });
}

const send_active_email = () => {
  $backend('/user/active/send')
    .then(rsp => {
      if (rsp.err == 'ok') {
        $alert("success", "激活邮件已发出！");
      } else {
        $alert("error", rsp.msg);
      }
    });
}

onMounted(() => {
  mainStore.setNavbar(true)
  $backend("/user/info?detail=1")
    .then(rsp => {
      rsp.user.password0 = "";
      rsp.user.password1 = "";
      rsp.user.password2 = "";
      user.value = rsp.user;
    });
})
</script>

<style></style>
