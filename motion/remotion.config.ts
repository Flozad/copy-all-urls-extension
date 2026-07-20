import {Config} from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setConcurrency(4)
Config.overrideWebpackConfig((c) => c)
