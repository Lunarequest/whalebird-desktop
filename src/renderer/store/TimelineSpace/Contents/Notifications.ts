import generator, { Entity, FilterContext, NotificationType } from 'megalodon'
import { Module, MutationTree, ActionTree, GetterTree } from 'vuex'
import { RootState } from '@/store'
import { LocalMarker } from '~/src/types/localMarker'
import { MyWindow } from '~/src/types/global'

const win = (window as any) as MyWindow

export type NotificationsState = {
  lazyLoading: boolean
  heading: boolean
  notifications: Array<Entity.Notification>
  scrolling: boolean
}

const state = (): NotificationsState => ({
  lazyLoading: false,
  heading: true,
  notifications: [],
  scrolling: false
})

export const MUTATION_TYPES = {
  CHANGE_LAZY_LOADING: 'changeLazyLoading',
  CHANGE_HEADING: 'changeHeading',
  APPEND_NOTIFICATIONS: 'appendNotifications',
  UPDATE_NOTIFICATIONS: 'updateNotifications',
  INSERT_NOTIFICATIONS: 'insertNotifications',
  UPDATE_TOOT: 'updateToot',
  DELETE_TOOT: 'deleteToot',
  CLEAR_NOTIFICATIONS: 'clearNotifications',
  ARCHIVE_NOTIFICATIONS: 'archiveNotifications',
  CHANGE_SCROLLING: 'changeScrolling'
}

const mutations: MutationTree<NotificationsState> = {
  [MUTATION_TYPES.CHANGE_LAZY_LOADING]: (state, value: boolean) => {
    state.lazyLoading = value
  },
  [MUTATION_TYPES.CHANGE_HEADING]: (state, value: boolean) => {
    state.heading = value
  },
  [MUTATION_TYPES.APPEND_NOTIFICATIONS]: (state, notification: Entity.Notification) => {
    // Reject duplicated status in timeline
    if (!state.notifications.find(item => item.id === notification.id)) {
      state.notifications = [notification].concat(state.notifications)
    }
  },
  [MUTATION_TYPES.UPDATE_NOTIFICATIONS]: (state, notifications: Array<Entity.Notification>) => {
    state.notifications = notifications
  },
  [MUTATION_TYPES.INSERT_NOTIFICATIONS]: (state, notifications: Array<Entity.Notification>) => {
    state.notifications = state.notifications.concat(notifications)
  },
  [MUTATION_TYPES.UPDATE_TOOT]: (state, message: Entity.Status) => {
    state.notifications = state.notifications.map(notification => {
      // I want to update toot only mention.
      // Because Toot component don't use status information when other patterns.
      if (notification.type === 'mention' && notification.status && notification.status.id === message.id) {
        const status = {
          status: message
        }
        return Object.assign(notification, status)
      } else {
        return notification
      }
    })
  },
  [MUTATION_TYPES.DELETE_TOOT]: (state, id: string) => {
    state.notifications = state.notifications.filter(notification => {
      if (notification.status) {
        if (notification.status.reblog && notification.status.reblog.id === id) {
          return false
        } else {
          return notification.status.id !== id
        }
      } else {
        return true
      }
    })
  },
  [MUTATION_TYPES.CLEAR_NOTIFICATIONS]: state => {
    state.notifications = []
  },
  [MUTATION_TYPES.ARCHIVE_NOTIFICATIONS]: state => {
    state.notifications = state.notifications.slice(0, 30)
  },
  [MUTATION_TYPES.CHANGE_SCROLLING]: (state, value: boolean) => {
    state.scrolling = value
  }
}

const actions: ActionTree<NotificationsState, RootState> = {
  fetchNotifications: async ({ commit, rootState }): Promise<Array<Entity.Notification>> => {
    const client = generator(
      rootState.TimelineSpace.sns,
      rootState.TimelineSpace.account.baseURL,
      rootState.TimelineSpace.account.accessToken,
      rootState.App.userAgent
    )
    const res = await client.getNotifications({ limit: 30 })
    commit(MUTATION_TYPES.UPDATE_NOTIFICATIONS, res.data)
    return res.data
  },
  lazyFetchNotifications: (
    { state, commit, rootState },
    lastNotification: Entity.Notification
  ): Promise<Array<Entity.Notification> | null> => {
    if (state.lazyLoading) {
      return Promise.resolve(null)
    }
    commit(MUTATION_TYPES.CHANGE_LAZY_LOADING, true)
    const client = generator(
      rootState.TimelineSpace.sns,
      rootState.TimelineSpace.account.baseURL,
      rootState.TimelineSpace.account.accessToken,
      rootState.App.userAgent
    )
    return client
      .getNotifications({ max_id: lastNotification.id, limit: 30 })
      .then(res => {
        commit(MUTATION_TYPES.INSERT_NOTIFICATIONS, res.data)
        return res.data
      })
      .finally(() => {
        commit(MUTATION_TYPES.CHANGE_LAZY_LOADING, false)
      })
  },
  resetBadge: () => {
    win.ipcRenderer.send('reset-badge')
  },
  saveMarker: async ({ rootState }, id: string) => {
    await win.ipcRenderer.invoke('save-marker', {
      owner_id: rootState.TimelineSpace.account._id,
      timeline: 'notifications',
      last_read_id: id
    } as LocalMarker)
  }
}

const getters: GetterTree<NotificationsState, RootState> = {
  handledNotifications: state => {
    return state.notifications.filter(n => {
      switch (n.type) {
        case NotificationType.Follow:
        case NotificationType.Favourite:
        case NotificationType.Reblog:
        case NotificationType.Mention:
        case NotificationType.EmojiReaction:
        case NotificationType.FollowRequest:
        case NotificationType.Status:
        case NotificationType.PollVote:
        case NotificationType.PollExpired:
          return true
        default:
          return false
      }
    })
  },
  filters: (_state, _getters, rootState) => {
    return rootState.TimelineSpace.filters.filter(f => f.context.includes(FilterContext.Notifications) && !f.irreversible)
  }
}

const Notifications: Module<NotificationsState, RootState> = {
  namespaced: true,
  state: state,
  mutations: mutations,
  actions: actions,
  getters: getters
}

export default Notifications
