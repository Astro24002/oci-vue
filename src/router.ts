import { createRouter, createWebHistory } from 'vue-router'

const ImageListView = () => import('./views/ImageListView.vue')
const ImageDetailView = () => import('./views/ImageDetailView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'images', component: ImageListView },
    { path: '/images/:imageName+', name: 'image-detail', component: ImageDetailView, props: true }
  ]
})
