// src/store/index.js
import { createStore } from 'vuex';

export default createStore({
  state: {
    solerResults: {} // This will store computed cost details and related data
  },
  mutations: {
    setSolerResults(state, payload) {
      state.solerResults = payload;
    }
  },
  actions: {
    updateSolerResults({ commit }, payload) {
      commit('setSolerResults', payload);
    }
  },
  getters: {
    solerResults: (state) => state.solerResults
  }
});
