import { Response, Entity } from 'megalodon'
import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import AccountStore, { AccountState } from '@/store/TimelineSpace/Contents/Search/Account'

const account: Entity.Account = {
  id: '1',
  username: 'h3poteto',
  acct: 'h3poteto@pleroma.io',
  display_name: 'h3poteto',
  locked: false,
  created_at: '2019-03-26T21:30:32',
  followers_count: 10,
  following_count: 10,
  statuses_count: 100,
  note: 'engineer',
  url: 'https://pleroma.io',
  avatar: '',
  avatar_static: '',
  header: '',
  header_static: '',
  emojis: [],
  moved: null,
  fields: null,
  bot: false
}

const mockClient = {
  searchAccount: () => {
    return new Promise<Response<Array<Entity.Account>>>(resolve => {
      const res: Response<Array<Entity.Account>> = {
        data: [account],
        status: 200,
        statusText: 'OK',
        headers: {}
      }
      resolve(res)
    })
  }
}

jest.mock('megalodon', () => ({
  ...jest.requireActual('megalodon'),
  default: jest.fn(() => mockClient),
  __esModule: true
}))

const state = (): AccountState => {
  return {
    results: []
  }
}

const initStore = () => {
  return {
    namespaced: true,
    state: state(),
    actions: AccountStore.actions,
    mutations: AccountStore.mutations
  }
}

const contentsStore = {
  namespaced: true,
  state: {},
  mutations: {
    changeLoading: jest.fn()
  },
  actions: {}
}

const timelineState = {
  namespaced: true,
  modules: {
    Contents: contentsStore
  },
  state: {
    account: {
      accessToken: 'token',
      baseURL: 'http://localhost'
    },
    sns: 'mastodon'
  }
}

const appState = {
  namespaced: true,
  state: {
    proxyConfiguration: false
  }
}

describe('Search/Account', () => {
  let store
  let localVue

  beforeEach(() => {
    localVue = createLocalVue()
    localVue.use(Vuex)
    store = new Vuex.Store({
      modules: {
        Account: initStore(),
        TimelineSpace: timelineState,
        App: appState
      }
    })
  })

  describe('search', () => {
    it('should be updated', async () => {
      await store.dispatch('Account/search', 'query')
      expect(store.state.Account.results).toEqual([account])
    })
  })
})
