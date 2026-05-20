import { createRouter, createWebHashHistory } from 'vue-router'

const ImageListView = () => import('./views/ImageListView.vue')
const ImageDetailView = () => import('./views/ImageDetailView.vue')

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'images', component: ImageListView },
    { path: '/images/:imageName+', name: 'image-detail', component: ImageDetailView, props: true }
  ]
})
