import { mount } from '@vue/test-utils'
import App from './App.vue'
import { router } from './router'

test('renders the images placeholder route', async () => {
  router.push('/')
  await router.isReady()

  const wrapper = mount(App, {
    global: {
      plugins: [router]
    }
  })

  expect(wrapper.get('h1').text()).toBe('Images')
})
