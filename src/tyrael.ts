import { combineReducers, AnyAction, Dispatch, MiddlewareAPI, ReducersMapObject } from 'redux'
import { createReducer } from 'redux-starter-kit'

export interface State {
  [key: string]: any
}

export interface Effects {
  [key: string]: Effect
}
export interface Effect {
  (dispatch: any, getState: any): any
}

export interface BaseModel {
  state: State
  reducers: ReducersMapObject<any, AnyAction>
  effects: Effects
}
export interface Model extends BaseModel {
  namespace: string
}

export interface Middleware<DispatchExt = {}, S = any, D extends Dispatch = Dispatch> {
  (api: MiddlewareAPI<D, S>): (next: Dispatch<AnyAction>) => (action: any, ...arg: any) => any
}

interface Tyrael {
  dispatchEnhancer: Middleware
}

export default class tyrael implements Tyrael {
  private effects: Effects = {}
  options: any = {}
  asyncModels: Model[] = []
  staticModels: Model[] = [
    {
      namespace: 'loading',
      state: {
        effects: {},
        models: {},
        global: false
      },
      effects: {},
      reducers: {
        start: (state, { params }) => {
          if (state.effects[params]) {
            state.effects[params]++
          } else {
            state.effects[params] = 1
          }
          state.global = true
          state.models[params.split('/')[0]] = true
        },
        end: (state, { params }) => {
          state.effects[params]--
          state.models = {}
          Object.keys(state.effects).forEach((key: string) => {
            const effect = state.effects[key]
            if (effect !== 0) {
              state.models[key.split('/')[0]] = true
            }
          })
          state.global = Object.values(state.models).some((model: any) => model)
        }
      }
    }
  ]

  constructor(options?: object) {
    // this.staticModels = [...initModels, ...this.staticModels]
    const defalutOptions = { loading: true }
    this.options = { ...defalutOptions, ...options }
    // const { effects } = splitModel(this.staticModels)
    // this.effects = effects
  }

  getStaticReducer = () => {
    const { reducer } = splitModel(this.staticModels)
    return reducer
  }

  dispatchEnhancer_loadding = ({ dispatch, getState }: { dispatch: Dispatch; getState: any }) => (
    next: Dispatch<AnyAction>
  ) => (action: any, params: any) => {
    const { loading } = this.options
    if (this.effects[action.type] && loading) {
      dispatch({ type: `loading/start`, params: action.type })
      const res = next(action)
        .then(() => {
          dispatch({ type: `loading/end`, params: action.type })
        })
        .catch((e: any) => {
          console.error(e)
          dispatch({ type: `loading/end`, params: action.type })
        })
      return res
    }
    return next(action)
  }

  dispatchEnhancer = ({ dispatch, getState }: { dispatch: Dispatch; getState: any }) => (
    next: Dispatch<AnyAction>
  ) => (action: any, params: any) => {
    const effect = this.effects[action.type]
    if (effect) {
      return Promise.resolve(effect(action, { dispatch, getState }))
    }
    return next(action)
  }

  storeEnhancer = (createStore: any) => (...args: Array<any>) => {
    const store = createStore(...args)
    const replaceModels = (newModelArray: any) => {
      const { reducer, effects } = splitModel(newModelArray)
      this.effects = effects
      store.replaceReducer(reducer)
    }
    const injectModels = (models: Array<Model>) => {
      const _injectModels = this.modelsFilter(models)
      if (_injectModels.length == 0) {
        return
      }
      this.asyncModels = [...this.asyncModels, ..._injectModels]
      replaceModels([...this.staticModels, ...this.asyncModels])
    }

    return {
      ...store,
      injectModels,
      effects: this.effects
    }
  }

  private modelsFilter(models_inject: Array<Model>) {
    const allModels = [...this.staticModels, ...this.asyncModels]
    return models_inject.filter((injectModel: Model) =>
      allModels.every((model: Model) => {
        if (injectModel.namespace == model.namespace) {
          if (injectModel == model) {
            return false
          }
          throw new Error(`namespace "${injectModel.namespace}" should be unique!`)
        }

        return true
      })
    )
  }
}
export function splitModel(modelArray: any) {
  const reducerSplice: any = {}
  const effects: any = {}
  modelArray.forEach((model: any) => {
    const namespace = model.namespace
    //get storeSlice
    const modelReducer = model.reducers
    const _reducer: any = {}
    for (const key in modelReducer) {
      if (modelReducer.hasOwnProperty(key)) {
        _reducer[namespace + '/' + key] = modelReducer[key]
      }
    }
    reducerSplice[namespace] = createReducer(model.state, _reducer)

    //get effect
    const modelEffect = model.effects
    for (const key in modelEffect) {
      if (modelEffect.hasOwnProperty(key)) {
        effects[namespace + '/' + key] = modelEffect[key]
      }
    }
  })

  return { reducer: combineReducers<any, AnyAction>(reducerSplice), effects }
}
