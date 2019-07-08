import { combineReducers, AnyAction, compose } from 'redux'
import { createReducer } from 'redux-starter-kit'

export default class leoric {
  private effects: any
  staticModels: any = []
  asyncModels: any = []

  constructor(staticModels: any) {
    const { effects } = splitModel(staticModels)
    this.effects = effects
    this.staticModels = staticModels
  }

  getStaticReducer = () => {
    const { reducer } = splitModel(this.staticModels)
    return reducer
  }
  dispatchEnhancer = ({ dispatch, getState }: { dispatch: any; getState: any }) => (next: any) => (
    action: any,
    params: any
  ) => {
    if (typeof action == 'string') {
      action = {
        type: action,
        params
      }
    }
    if (this.effects[action.type]) {
      return this.effects[action.type](action, { dispatch, getState })
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
    const injectModels = (indectModels: any) => {
      const injectModels = this.modelsFilter(indectModels)
      if (injectModels.length == 0) {
        return
      }
      this.asyncModels = [...this.asyncModels, ...injectModels]
      replaceModels([...this.staticModels, ...this.asyncModels])
    }

    return {
      ...store,
      injectModels,
      effects: this.effects
    }
  }

  private modelsFilter(indectModels: any) {
    const models = [...this.staticModels, ...this.asyncModels]
    return indectModels.filter((injectModel: any) =>
      models.every((model: any) => {
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
